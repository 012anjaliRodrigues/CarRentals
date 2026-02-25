
import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import IdentityScreen from './components/IdentityScreen';
import GstScreen from './components/GstScreen';
import LocationScreen from './components/LocationScreen';
import SuccessScreen from './components/SuccessScreen';
import Dashboard from './components/Dashboard';
import { AppState, UserProfile } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppState>(AppState.SPLASH);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    businessAddress: '',
    isGstEnabled: false,
    gstType: 'Regular',
    gstNumber: '',
    locations: ['Panjim']
  });

  useEffect(() => {
    if (currentScreen === AppState.SPLASH) {
      const timer = setTimeout(() => {
        setCurrentScreen(AppState.LOGIN);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC]">
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">
        {currentScreen === AppState.SPLASH && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SplashScreen />
          </motion.div>
        )}

        {currentScreen === AppState.LOGIN && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <LoginScreen 
              onOtpSent={(phone) => {
                updateProfile({ phone });
                setCurrentScreen(AppState.OTP);
              }} 
              onSkipToDashboard={() => {
                updateProfile({
                  fullName: 'Arjun Sharma',
                  businessName: 'GaadiZai Rentals Goa',
                  phone: '+91 98234 56789',
                  email: 'arjun.sharma@gaadizai.com',
                  businessAddress: 'Suite 402, Business Hub, Downtown Street, Panjim, Goa, 403001',
                  isGstEnabled: true,
                  gstType: 'Regular',
                  gstNumber: '30AAACG1234A1Z5',
                  locations: ['Mapusa', 'Panjim', 'Calangute', 'Airport']
                });
                setCurrentScreen(AppState.DASHBOARD);
              }}
            />
          </motion.div>
        )}

        {currentScreen === AppState.OTP && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <OtpScreen 
              phoneNumber={userProfile.phone}
              onVerify={() => setCurrentScreen(AppState.IDENTITY)}
              onBack={() => setCurrentScreen(AppState.LOGIN)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.IDENTITY && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <IdentityScreen 
              onContinue={(data) => {
                updateProfile(data);
                setCurrentScreen(AppState.GST);
              }} 
              onLogout={() => setCurrentScreen(AppState.LOGIN)} 
            />
          </motion.div>
        )}

        {currentScreen === AppState.GST && (
          <motion.div
            key="gst"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <GstScreen 
              onContinue={(data) => {
                updateProfile(data);
                setCurrentScreen(AppState.LOCATIONS);
              }}
              onBack={() => setCurrentScreen(AppState.IDENTITY)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.LOCATIONS && (
          <motion.div
            key="locations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <LocationScreen 
              onComplete={(locations) => {
                updateProfile({ locations });
                setCurrentScreen(AppState.SUCCESS);
              }}
              onBack={() => setCurrentScreen(AppState.GST)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.SUCCESS && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SuccessScreen 
              onFinish={() => setCurrentScreen(AppState.DASHBOARD)} 
            />
          </motion.div>
        )}

        {currentScreen === AppState.DASHBOARD && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Dashboard 
              initialProfile={userProfile}
              onLogout={() => setCurrentScreen(AppState.LOGIN)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
