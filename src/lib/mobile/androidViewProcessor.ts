import { DOMParser } from 'xmldom';

// Helper functions for XML optimization
export interface OptimizedNode {
  name: string;
  attributes: Record<string, string>;
  children: OptimizedNode[];
  bounds?: { x: number; y: number; width: number; height: number };
  isVisible?: boolean;
  isInteractive?: boolean;
}

// List of meaningful attributes that should be preserved during optimization
const MEANINGFUL_ATTRIBUTES = [
  'text',
  'resource-id',
  'content-desc',
  'class',
  'package',
  'checkable',
  'checked',
  'clickable',
  'enabled',
  'focusable',
  'focused',
  'scrollable',
  'long-clickable',
  'password',
  'selected',
];

// Convert XML string to a DOM Document
export function parseXML(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'text/xml');
}

// Extract bounds from a bounds string like "[0,0][1080,2280]"
export function parseBounds(
  boundsStr?: string
): { x: number; y: number; width: number; height: number } | undefined {
  if (!boundsStr) return undefined;

  const matches = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!matches) return undefined;

  const x1 = parseInt(matches[1], 10);
  const y1 = parseInt(matches[2], 10);
  const x2 = parseInt(matches[3], 10);
  const y2 = parseInt(matches[4], 10);

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

// Check if node has any meaningful content (text, content-desc, etc.)
export function hasMeaningfulContent(node: Element): boolean {
  const hasText = node.getAttribute('text') && node.getAttribute('text') !== '';
  const hasContentDesc =
    node.getAttribute('content-desc') && node.getAttribute('content-desc') !== '';
  const isClickable = node.getAttribute('clickable') === 'true';
  const isFocused = node.getAttribute('focused') === 'true';

  return hasText || hasContentDesc || isClickable || isFocused;
}

// Convert XML Element to OptimizedNode
export function elementToNode(element: Element): OptimizedNode {
  const attributes: Record<string, string> = {};

  // Extract relevant attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (MEANINGFUL_ATTRIBUTES.includes(attr.name)) {
      attributes[attr.name] = attr.value;
    }
  }

  // Parse bounds
  const bounds = parseBounds(element.getAttribute('bounds') || undefined);

  // Check visibility based on bounds
  const isVisible = bounds ? bounds.width > 0 && bounds.height > 0 : false;

  // Check if element is interactive
  const isInteractive =
    attributes['clickable'] === 'true' ||
    attributes['focusable'] === 'true' ||
    attributes['long-clickable'] === 'true';

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

// Optimize the node tree
export function optimizeNode(node: OptimizedNode): OptimizedNode | null {
  // Skip invisible elements
  if (node.bounds && (node.bounds.width <= 0 || node.bounds.height <= 0)) {
    return null;
  }

  // Skip system UI elements like status bar
  if (
    node.attributes['resource-id'] &&
    (node.attributes['resource-id'].includes('status_bar_container') ||
      node.attributes['resource-id'].includes('navigation_bar'))
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

// Convert optimized node to a readable string
export function nodeToString(node: OptimizedNode, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let result = spaces;

  // Extract class name if available
  const className = node.attributes['class']
    ? node.attributes['class'].split('.').pop()
    : node.name;

  result += `${className}(`;

  // Add important attributes
  const attrStrings: string[] = [];

  // Handle special attributes first
  if (node.attributes['text']) {
    attrStrings.push(`text="${node.attributes['text']}"`);
  }

  if (node.attributes['content-desc']) {
    attrStrings.push(`accessibilityText="${node.attributes['content-desc']}"`);
  }

  if (node.attributes['resource-id']) {
    const idParts = node.attributes['resource-id'].split('/');
    attrStrings.push(`id="${idParts[idParts.length - 1]}"`);
  }

  // Add bounds info
  if (node.bounds) {
    attrStrings.push(
      `bounds=[${node.bounds.x},${node.bounds.y}][${node.bounds.x + node.bounds.width},${node.bounds.y + node.bounds.height}]`
    );
  }

  // Add other boolean attributes
  if (node.attributes['clickable'] === 'true') {
    attrStrings.push(`clickable=true`);
  }

  ['focused', 'selected', 'enabled'].forEach(attr => {
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
    // Check if current node is interactive or has text
    if ((node.isInteractive || node.attributes['text']) && node.isVisible) {
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

// Format a single element for the indexed list
export function formatElement(node: OptimizedNode): string {
  // Extract class name if available
  const className = node.attributes['class']
    ? node.attributes['class'].split('.').pop()
    : node.name;

  let result = `${className}(`;

  // Add important attributes
  const attrStrings: string[] = [];

  // Handle special attributes first
  if (node.attributes['text']) {
    attrStrings.push(` text=${node.attributes['text']}`);
  }

  if (node.attributes['content-desc']) {
    attrStrings.push(` accessibilityText=${node.attributes['content-desc']}`);
  }

  if (node.attributes['resource-id']) {
    const idParts = node.attributes['resource-id'].split('/');
    attrStrings.push(` id=${idParts[idParts.length - 1]}`);
  }

  // Add bounds info
  if (node.bounds) {
    attrStrings.push(
      `  bounds=[${node.bounds.x},${node.bounds.y}][${node.bounds.x + node.bounds.width},${node.bounds.y + node.bounds.height}]`
    );
  }

  // Add clickable attribute
  if (node.attributes['clickable'] === 'true') {
    attrStrings.push(` clickable=true`);
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

// Optimize XML hierarchy and return both optimized structure and elements list
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
    console.error('Error processing page source:', error);
    throw error;
  }
}
