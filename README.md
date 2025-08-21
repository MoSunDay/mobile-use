# mobile-use

Perform mobile tasks using natural language instructions.

[![demo video](https://img.youtube.com/vi/0KCYf455hww/maxresdefault.jpg)](https://www.youtube.com/watch?v=0KCYf455hww)

## Features

- **Multi-Agent System**: Uses three specialized agents (Planner, Navigator, and Validator) to complete mobile tasks
- **Cross-Platform Support**: Works with both Android and iOS devices/simulators
- **Mobile Automation**: Integrates with Appium for reliable mobile device automation
- **Streaming Responses**: Provides real-time feedback as agents work on tasks
- **Configurable Models**: Allows different LLM models for each agent type
- **Provider Support**: Works with OpenAI, Anthropic, and other LLM providers
- **Structured Logging**: Comprehensive logging system with namespaces for debugging and monitoring
- **Platform Detection**: Automatic platform detection and configuration

## Architecture

### Agents

1. **Planner Agent**: Analyzes the user's task and creates a plan for completing it
2. **Navigator Agent**: Executes mobile actions to complete the task
3. **Validator Agent**: Verifies if the task has been completed successfully

### Mobile Automation

The application uses Appium for cross-platform mobile automation, providing these capabilities:

**Android Support (UiAutomator2):**
- App launching and navigation
- Tapping on UI elements
- Text input and keyboard handling
- Scrolling and gestures
- Taking screenshots
- Element identification via resource-id, text, content-desc

**iOS Support (XCUITest):**
- App launching and navigation
- Tapping on UI elements
- Text input and keyboard handling
- Scrolling and gestures
- Taking screenshots
- Element identification via name, label, accessibility attributes

### Logging

The application includes a structured logging system that:

- Supports different log levels (debug, info, warning, error)
- Uses namespaces to organize logs by component
- Provides log grouping for related operations
- Automatically filters debug logs in production
- Helps with debugging and monitoring application behavior

## Getting Started

### Prerequisites

- Node.js 20+
- Appium server
- A connected mobile device or emulator/simulator

**For Android:**
- Android SDK and ADB
- Android emulator or physical device
- UiAutomator2 driver

**For iOS:**
- Xcode (macOS only)
- iOS Simulator or physical device
- XCUITest driver
- For physical devices: proper provisioning profiles and certificates

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Appium drivers:
   ```bash
   # For Android only
   npm run setup:appium

   # For iOS only
   npm run setup:appium:ios

   # For both platforms
   npm run setup:appium:all
   ```
4. Set up environment variables:

   - Create a `.env.local` file in the root directory
   - Add your API keys and configuration:

   ```
   # LLM API Keys
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_BASE_URL=https://api.openai.com

   # Default LLM Provider and Model
   DEFAULT_LLM_PROVIDER=openai
   DEFAULT_MODEL_NAME=gpt-4o

   # Mobile Testing Configuration
   APPIUM_PORT=4723
   APPIUM_HOST=localhost

   # Platform Configuration (optional)
   MOBILE_PLATFORM=Android  # or iOS

   # Android Configuration (optional)
   ANDROID_DEVICE_NAME=Android Emulator
   ANDROID_APP_PACKAGE=com.example.app
   ANDROID_APP_ACTIVITY=.MainActivity

   # iOS Configuration (optional)
   IOS_DEVICE_NAME=iPhone Simulator
   IOS_PLATFORM_VERSION=17.0
   IOS_BUNDLE_ID=com.example.app
   IOS_UDID=your-device-udid
   ```

5. Start Appium server:

   ```
   npm run appium
   ```

6. Start the development server:

   ```
   npm run dev
   ```

   For debugging with logs:

   ```
   # Show all debug logs
   npm run dev:debug

   # Show only agent-related logs
   npm run dev:agent

   # Custom debug namespaces
   npm run debug [namespace]

   # Examples:
   npm run debug                  # All logs (DEBUG=*)
   npm run debug agent            # All agent logs (DEBUG=agent:*)
   npm run debug agent:navigator  # Navigator agent logs (DEBUG=agent:navigator*)
   npm run debug mobile,api       # Mobile and API logs (DEBUG=mobile*,api*)
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. **Platform Setup**: Choose your target platform (Android or iOS)
2. **LLM Configuration**: Click the settings icon in the top right corner
3. Select your preferred provider and models
4. Configure device capabilities and platform-specific settings
5. Save your settings

### Platform Configuration

The application automatically detects the platform from environment variables, but you can also configure it manually:

**Via Environment Variables:**
```bash
export MOBILE_PLATFORM=iOS
export IOS_DEVICE_NAME="iPhone 15 Pro"
export IOS_PLATFORM_VERSION="17.0"
```

**Via API:**
```bash
# Set to iOS
curl -X POST http://localhost:3000/api/platform \
  -H "Content-Type: application/json" \
  -d '{"platform": "iOS", "deviceName": "iPhone Simulator", "platformVersion": "17.0"}'

# Set to Android
curl -X POST http://localhost:3000/api/platform \
  -H "Content-Type: application/json" \
  -d '{"platform": "Android", "deviceName": "Pixel 7 Emulator"}'
```

**Via UI:** Use the Platform Selector component in the application interface.

## Usage

1. Enter a task in the input field (e.g., "Open the calculator app and calculate 2+2")
2. Click "Submit" to start the task
3. Watch as the agents work together to complete your task on the mobile device
4. View the results in real-time

## Examples

**Android Examples:**
- "Open the Settings app and turn on Airplane mode"
- "Launch Chrome and search for the weather"
- "Open the contacts app and create a new contact"
- "Navigate to Developer Options and enable USB Debugging"

**iOS Examples:**
- "Open Settings and turn on Do Not Disturb"
- "Launch Safari and search for the weather"
- "Open Contacts and create a new contact"
- "Go to Settings > Privacy & Security and review app permissions"

**Cross-Platform Examples:**
- "Take a screenshot of the home screen"
- "Open the calculator app and calculate 2+2"
- "Find and open the camera app"

## Testing

To run tests:

```
npm test
```

## Development

### Logging

The application uses a structured logging system to help with debugging and monitoring:

```typescript
import { createLogger } from '@/lib/utils/logger';

// Create a logger with a namespace
const logger = createLogger('MyComponent');

// Use different log levels
logger.debug('Detailed information for debugging');
logger.info('General information about application operation');
logger.warn('Warning about potential issues');
logger.error('Error information when something goes wrong');

// Group related logs
logger.group('Operation name');
logger.info('Step 1');
logger.info('Step 2');
logger.groupEnd();
```

## Credits

Inspired by these github projects, arixv papers

- [browser-use](https://github.com/browser-use/browser-use)
- [nanobrowser](https://github.com/nanobrowser/nanobrowser)
- [arbigent](https://github.com/takahirom/arbigent)
- [computer use survey paper](https://arxiv.org/pdf/2501.16150)

Zurich, Dubai
