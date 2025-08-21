'use client';

import { useState, useEffect } from 'react';
import { FiSmartphone, FiTablet, FiSettings } from 'react-icons/fi';

interface PlatformConfig {
  platform: 'Android' | 'iOS';
  deviceName: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
  platformVersion?: string;
}

interface PlatformSelectorProps {
  onPlatformChange: (config: PlatformConfig) => void;
  disabled?: boolean;
}

export default function PlatformSelector({ onPlatformChange, disabled = false }: PlatformSelectorProps) {
  const [currentPlatform, setCurrentPlatform] = useState<'Android' | 'iOS'>('Android');
  const [deviceName, setDeviceName] = useState('');
  const [appPackage, setAppPackage] = useState('');
  const [appActivity, setAppActivity] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [platformVersion, setPlatformVersion] = useState('17.0');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load current platform configuration
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/platform');
      const data = await response.json();
      
      if (data.success) {
        setCurrentPlatform(data.platform);
        const caps = data.config.capabilities;
        
        if (data.platform === 'Android') {
          setDeviceName(caps['appium:deviceName'] || 'Android Emulator');
          setAppPackage(caps['appium:appPackage'] || '');
          setAppActivity(caps['appium:appActivity'] || '');
        } else {
          setDeviceName(caps['appium:deviceName'] || 'iPhone Simulator');
          setBundleId(caps['appium:bundleId'] || '');
          setPlatformVersion(caps['appium:platformVersion'] || '17.0');
        }
      }
    } catch (error) {
      console.error('Failed to load platform config:', error);
    }
  };

  const handlePlatformChange = (platform: 'Android' | 'iOS') => {
    setCurrentPlatform(platform);
    
    // Set default values for the platform
    if (platform === 'Android') {
      setDeviceName('Android Emulator');
    } else {
      setDeviceName('iPhone Simulator');
      setPlatformVersion('17.0');
    }
  };

  const handleApplyConfig = async () => {
    setIsLoading(true);
    
    try {
      const config: PlatformConfig = {
        platform: currentPlatform,
        deviceName,
      };

      if (currentPlatform === 'Android') {
        if (appPackage) config.appPackage = appPackage;
        if (appActivity) config.appActivity = appActivity;
      } else {
        if (bundleId) config.bundleId = bundleId;
        config.platformVersion = platformVersion;
      }

      const response = await fetch('/api/platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (data.success) {
        onPlatformChange(config);
      } else {
        console.error('Failed to set platform config:', data.error);
      }
    } catch (error) {
      console.error('Error setting platform config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Platform Configuration</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiSettings />
        </button>
      </div>

      {/* Platform Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platform
        </label>
        <div className="flex space-x-4">
          <button
            onClick={() => handlePlatformChange('Android')}
            disabled={disabled}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md border ${
              currentPlatform === 'Android'
                ? 'bg-green-100 border-green-500 text-green-700'
                : 'bg-gray-100 border-gray-300 text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
          >
            <FiSmartphone />
            <span>Android</span>
          </button>
          <button
            onClick={() => handlePlatformChange('iOS')}
            disabled={disabled}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md border ${
              currentPlatform === 'iOS'
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-gray-100 border-gray-300 text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`}
          >
            <FiTablet />
            <span>iOS</span>
          </button>
        </div>
      </div>

      {/* Device Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Device Name
        </label>
        <input
          type="text"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          disabled={disabled}
          placeholder={currentPlatform === 'Android' ? 'Android Emulator' : 'iPhone Simulator'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h4>
          
          {currentPlatform === 'Android' ? (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  App Package (Optional)
                </label>
                <input
                  type="text"
                  value={appPackage}
                  onChange={(e) => setAppPackage(e.target.value)}
                  disabled={disabled}
                  placeholder="com.example.app"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  App Activity (Optional)
                </label>
                <input
                  type="text"
                  value={appActivity}
                  onChange={(e) => setAppActivity(e.target.value)}
                  disabled={disabled}
                  placeholder="com.example.app.MainActivity"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Bundle ID (Optional)
                </label>
                <input
                  type="text"
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  disabled={disabled}
                  placeholder="com.example.app"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Platform Version
                </label>
                <input
                  type="text"
                  value={platformVersion}
                  onChange={(e) => setPlatformVersion(e.target.value)}
                  disabled={disabled}
                  placeholder="17.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Apply Button */}
      <button
        onClick={handleApplyConfig}
        disabled={disabled || isLoading || !deviceName}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Applying...' : 'Apply Configuration'}
      </button>
    </div>
  );
}
