import { DOMParser } from 'xmldom';

// Helper functions for iOS XML optimization
export interface OptimizedNode {
  name: string;
  attributes: Record<string, string>;
  children: OptimizedNode[];
  bounds?: { x: number; y: number; width: number; height: number };
  isVisible?: boolean;
  isInteractive?: boolean;
}

// List of meaningful attributes for iOS elements
const MEANINGFUL_ATTRIBUTES = [
  'name',           // iOS equivalent of text
  'label',          // iOS accessibility label
  'value',          // iOS element value
  'type',           // iOS element type
  'enabled',        // iOS enabled state
  'visible',        // iOS visibility
  'accessible',     // iOS accessibility
  'selected',       // iOS selection state
  'focused',        // iOS focus state
  'x',              // iOS x coordinate
  'y',              // iOS y coordinate
  'width',          // iOS width
  'height',         // iOS height
];

// Convert XML string to a DOM Document
export function parseXML(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'text/xml');
}

// Extract bounds from iOS element attributes
export function parseBounds(element: Element): { x: number; y: number; width: number; height: number } | undefined {
  const x = element.getAttribute('x');
  const y = element.getAttribute('y');
  const width = element.getAttribute('width');
  const height = element.getAttribute('height');

  if (!x || !y || !width || !height) return undefined;

  return {
    x: parseInt(x, 10),
    y: parseInt(y, 10),
    width: parseInt(width, 10),
    height: parseInt(height, 10),
  };
}

// Check if iOS node has any meaningful content
export function hasMeaningfulContent(node: Element): boolean {
  const hasName = node.getAttribute('name') && node.getAttribute('name') !== '';
  const hasLabel = node.getAttribute('label') && node.getAttribute('label') !== '';
  const hasValue = node.getAttribute('value') && node.getAttribute('value') !== '';
  const isEnabled = node.getAttribute('enabled') === 'true';
  const isAccessible = node.getAttribute('accessible') === 'true';

  return hasName || hasLabel || hasValue || isEnabled || isAccessible;
}

// Convert XML Element to OptimizedNode for iOS
export function elementToNode(element: Element): OptimizedNode {
  const attributes: Record<string, string> = {};

  // Extract relevant attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (MEANINGFUL_ATTRIBUTES.includes(attr.name)) {
      attributes[attr.name] = attr.value;
    }
  }

  // Parse bounds from iOS attributes
  const bounds = parseBounds(element);

  // Check visibility based on bounds and visible attribute
  const isVisible = bounds ? 
    bounds.width > 0 && bounds.height > 0 && attributes['visible'] !== 'false' : 
    attributes['visible'] !== 'false';

  // Check if element is interactive (iOS specific)
  const isInteractive = 
    attributes['enabled'] === 'true' ||
    attributes['accessible'] === 'true' ||
    isIOSInteractiveType(attributes['type']);

  // Create node
  const node: OptimizedNode = {
    name: element.nodeName,
    attributes,
    children: [],
    bounds,
    isVisible,
    isInteractive,
  };

  // Process children
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === 1) {
      // Element node
      node.children.push(elementToNode(child as Element));
    }
  }

  return node;
}

// Check if iOS element type is interactive
function isIOSInteractiveType(type?: string): boolean {
  if (!type) return false;
  
  const interactiveTypes = [
    'XCUIElementTypeButton',
    'XCUIElementTypeTextField',
    'XCUIElementTypeSecureTextField',
    'XCUIElementTypeSearchField',
    'XCUIElementTypeSwitch',
    'XCUIElementTypeSlider',
    'XCUIElementTypeSegmentedControl',
    'XCUIElementTypePicker',
    'XCUIElementTypePickerWheel',
    'XCUIElementTypeLink',
    'XCUIElementTypeCell',
    'XCUIElementTypeTabBar',
    'XCUIElementTypeNavigationBar',
    'XCUIElementTypeToolbar',
  ];
  
  return interactiveTypes.includes(type);
}

// Optimize the iOS node tree
export function optimizeNode(node: OptimizedNode): OptimizedNode | null {
  // Skip invisible elements
  if (node.bounds && (node.bounds.width <= 0 || node.bounds.height <= 0)) {
    return null;
  }

  // Skip iOS system UI elements
  if (
    node.attributes['type'] &&
    (node.attributes['type'].includes('StatusBar') ||
      node.attributes['type'].includes('NavigationBar') && !node.attributes['name'])
  ) {
    return null;
  }

  // Optimize children
  const optimizedChildren: OptimizedNode[] = [];
  for (const child of node.children) {
    const optimizedChild = optimizeNode(child);
    if (optimizedChild) {
      optimizedChildren.push(optimizedChild);
    }
  }

  // Replace children with optimized children
  node.children = optimizedChildren;

  // If this node has no meaningful content and only one child, promote the child
  const hasMeaningful = Object.keys(node.attributes).some(
    key =>
      node.attributes[key] !== '' &&
      node.attributes[key] !== 'false' &&
      node.attributes[key] !== 'null'
  );

  if (!hasMeaningful && optimizedChildren.length === 1) {
    return optimizedChildren[0];
  }

  // If node has no content and no children, remove it
  if (!hasMeaningful && optimizedChildren.length === 0) {
    return null;
  }

  return node;
}

// Convert optimized iOS node to a readable string
export function nodeToString(node: OptimizedNode, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = spaces;

  // Extract type name if available
  const typeName = node.attributes['type']
    ? node.attributes['type'].replace('XCUIElementType', '')
    : node.name;

  result += `${typeName}(`;

  // Add important attributes
  const attrStrings: string[] = [];

  // Handle special attributes first
  if (node.attributes['name']) {
    attrStrings.push(`name="${node.attributes['name']}"`);
  }

  if (node.attributes['label']) {
    attrStrings.push(`label="${node.attributes['label']}"`);
  }

  if (node.attributes['value']) {
    attrStrings.push(`value="${node.attributes['value']}"`);
  }

  // Add bounds info
  if (node.bounds) {
    attrStrings.push(
      `bounds=[${node.bounds.x},${node.bounds.y}][${node.bounds.x + node.bounds.width},${node.bounds.y + node.bounds.height}]`
    );
  }

  // Add other boolean attributes
  if (node.attributes['enabled'] === 'true') {
    attrStrings.push(`enabled=true`);
  }

  ['focused', 'selected', 'accessible'].forEach(attr => {
    if (node.attributes[attr] === 'true') {
      attrStrings.push(`${attr}=true`);
    }
  });

  result += attrStrings.join(',\n' + spaces + '  ');

  // Add children if any
  if (node.children.length > 0) {
    result += ',\n';
    result += spaces + '  children=[\n';
    result += node.children.map(child => nodeToString(child, indent + 4)).join(',\n');
    result += '\n' + spaces + '  ]';
  }

  result += ')';
  return result;
}

// Extract interactive elements and return them as an indexed list
export function extractInteractiveElements(node: OptimizedNode): OptimizedNode[] {
  const interactiveElements: OptimizedNode[] = [];

  function traverse(node: OptimizedNode) {
    // Check if current node is interactive or has meaningful content
    if ((node.isInteractive || node.attributes['name'] || node.attributes['label']) && node.isVisible) {
      interactiveElements.push(node);
    }

    // Recursively traverse children
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(node);
  return interactiveElements;
}

// Format a single iOS element for the indexed list
export function formatElement(node: OptimizedNode): string {
  // Extract type name if available
  const typeName = node.attributes['type']
    ? node.attributes['type'].replace('XCUIElementType', '')
    : node.name;

  let result = `${typeName}(`;

  // Add important attributes
  const attrStrings: string[] = [];

  // Handle special attributes first
  if (node.attributes['name']) {
    attrStrings.push(` name=${node.attributes['name']}`);
  }

  if (node.attributes['label']) {
    attrStrings.push(` label=${node.attributes['label']}`);
  }

  if (node.attributes['value']) {
    attrStrings.push(` value=${node.attributes['value']}`);
  }

  // Add bounds info
  if (node.bounds) {
    attrStrings.push(
      `  bounds=[${node.bounds.x},${node.bounds.y}][${node.bounds.x + node.bounds.width},${node.bounds.y + node.bounds.height}]`
    );
  }

  // Add enabled attribute
  if (node.attributes['enabled'] === 'true') {
    attrStrings.push(` enabled=true`);
  }

  result += attrStrings.join(', ');
  result += ')';

  return result;
}

// Format interactive elements as an indexed list
export function formatElementsList(elements: OptimizedNode[]): string {
  let result = '';

  elements.forEach((element, index) => {
    result += `  ${index}: ${formatElement(element)}\n`;
  });

  return result;
}

// Optimize iOS XML hierarchy and return both optimized structure and elements list
export async function processPageSource(xmlString: string): Promise<{
  interactiveElements: OptimizedNode[];
}> {
  try {
    // Parse XML
    const doc = parseXML(xmlString);
    const rootElement = doc.documentElement;

    // Convert to node structure
    const rootNode = elementToNode(rootElement);

    // Optimize the tree
    const optimizedRoot = optimizeNode(rootNode);

    if (!optimizedRoot) {
      throw new Error('Optimization resulted in an empty tree');
    }

    // Extract interactive elements
    const interactiveElements = extractInteractiveElements(optimizedRoot);

    return {
      interactiveElements,
    };
  } catch (error) {
    console.error('Error processing iOS page source:', error);
    throw error;
  }
}
