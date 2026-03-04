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
import { getCurrentUser, getCurrentOwner, ensureDevSession, createOwnerIfNotExists, supabase } from './supabaseClient';

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
    locations: ['Panjim'],
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const formatPhoneForDisplay = (digits: string) => {
    const cleaned = (digits || '').replace(/\D/g, '').slice(-10);
    if (cleaned.length !== 10) return digits;
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  // Saves owner fields to DB — only runs if a session exists
  const ownerUpdate = async (updates: Record<string, any>) => {
    const authUser = await getCurrentUser();
    if (!authUser) {
      console.warn('ownerUpdate: no session, skipping');
      return;
    }
    const { error } = await supabase
      .from('owners')
      .update(updates)
      .eq('user_id', authUser.id);
    if (error) {
      console.error('Error updating owner:', error);
    }
  };

  // Splash → Login
  useEffect(() => {
    if (currentScreen === AppState.SPLASH) {
      const timer = setTimeout(() => setCurrentScreen(AppState.LOGIN), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // On mount: resume from existing session
  useEffect(() => {
    const bootstrapFromSession = async () => {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const owner = await getCurrentOwner();
      if (!owner) {
        setCurrentScreen(AppState.IDENTITY);
        return;
      }

      updateProfile({
        fullName: owner.full_name ?? '',
        businessName: owner.business_name ?? '',
        phone: formatPhoneForDisplay((authUser.phone ?? '').replace(/^\+91/, '')),
        email: owner.email ?? '',
        businessAddress: owner.business_address ?? '',
        isGstEnabled: owner.is_gst_enabled ?? false,
        gstType: owner.gst_type ?? 'Regular',
        gstNumber: owner.gst_number ?? '',
        locations: owner.service_locations ?? ['Panjim'],
      });

      const step: number | null = typeof owner.onboarding_step === 'number' ? owner.onboarding_step : null;

      if (owner.onboarding_completed_at) {
        setCurrentScreen(AppState.DASHBOARD);
      } else if (!step || step <= 1) {
        setCurrentScreen(AppState.IDENTITY);
      } else if (step === 2) {
        setCurrentScreen(AppState.GST);
      } else if (step === 3) {
        setCurrentScreen(AppState.LOCATIONS);
      } else {
        setCurrentScreen(AppState.DASHBOARD);
      }
    };

    bootstrapFromSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Dev: Skip to Onboarding ──────────────────────────────────────────────
  // Creates a real Supabase session via email+password so all DB writes work.
  // No UI change — same button, just now saves real data.
  const handleSkipToOnboarding = async () => {
    const userId = await ensureDevSession();
    if (!userId) {
      console.error('Could not create dev session');
      setCurrentScreen(AppState.IDENTITY); // still navigate, saves will just fail silently
      return;
    }
    // Bootstrap owner row so ownerUpdate has something to UPDATE (not INSERT)
    await createOwnerIfNotExists(userId, 'dev_owner');
    setCurrentScreen(AppState.IDENTITY);
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC]">
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">

        {currentScreen === AppState.SPLASH && (
          <motion.div key="splash" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <SplashScreen />
          </motion.div>
        )}

        {currentScreen === AppState.LOGIN && (
          <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
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
                  locations: ['Mapusa', 'Panjim', 'Calangute', 'Airport'],
                });
                setCurrentScreen(AppState.DASHBOARD);
              }}
              onSkipToOnboarding={handleSkipToOnboarding}
            />
          </motion.div>
        )}

        {currentScreen === AppState.OTP && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
            <OtpScreen
              phoneNumber={(userProfile.phone || '').replace(/\D/g, '').slice(-10)}
              onVerify={({ nextScreen, owner }) => {
                if (owner) {
                  const digits = (owner?.phone || userProfile.phone || '').replace(/\D/g, '').slice(-10);
                  updateProfile({
                    fullName: owner.full_name ?? userProfile.fullName,
                    businessName: owner.business_name ?? userProfile.businessName,
                    phone: formatPhoneForDisplay(digits),
                    email: owner.email ?? userProfile.email,
                    businessAddress: owner.business_address ?? userProfile.businessAddress,
                    isGstEnabled: owner.is_gst_enabled ?? userProfile.isGstEnabled,
                    gstType: owner.gst_type ?? userProfile.gstType,
                    gstNumber: owner.gst_number ?? userProfile.gstNumber,
                    locations: owner.service_locations ?? userProfile.locations,
                  });
                }
                if (nextScreen === 'IDENTITY') setCurrentScreen(AppState.IDENTITY);
                else if (nextScreen === 'GST') setCurrentScreen(AppState.GST);
                else if (nextScreen === 'LOCATIONS') setCurrentScreen(AppState.LOCATIONS);
                else setCurrentScreen(AppState.DASHBOARD);
              }}
              onBack={() => setCurrentScreen(AppState.LOGIN)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.IDENTITY && (
          <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
            <IdentityScreen
              onContinue={async (data) => {
                updateProfile(data);
                await ownerUpdate({
                  full_name: data.fullName,
                  business_name: data.businessName,
                  email: data.email,
                  business_address: data.businessAddress,
                  onboarding_step: 2,
                });
                setCurrentScreen(AppState.GST);
              }}
              onLogout={async () => {
                await supabase.auth.signOut();
                setCurrentScreen(AppState.LOGIN);
              }}
            />
          </motion.div>
        )}

        {currentScreen === AppState.GST && (
          <motion.div key="gst" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4 }}>
            <GstScreen
              onContinue={async (data) => {
                updateProfile(data);
                await ownerUpdate({
                  is_gst_enabled: data.isGstEnabled,
                  gst_type: data.isGstEnabled ? data.gstType : null,
                  gst_number: data.isGstEnabled ? data.gstNumber : null,
                  onboarding_step: 3,
                });
                setCurrentScreen(AppState.LOCATIONS);
              }}
              onBack={() => setCurrentScreen(AppState.IDENTITY)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.LOCATIONS && (
          <motion.div key="locations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <LocationScreen
              onComplete={async (locations) => {
                updateProfile({ locations });
                const uniqueLocations = Array.from(new Set(['Panjim', ...(locations || [])]));
                await ownerUpdate({
                  service_locations: uniqueLocations,
                  onboarding_step: 4,
                  onboarding_completed_at: new Date().toISOString(),
                });
                setCurrentScreen(AppState.SUCCESS);
              }}
              onBack={() => setCurrentScreen(AppState.GST)}
            />
          </motion.div>
        )}

        {currentScreen === AppState.SUCCESS && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <SuccessScreen onFinish={() => setCurrentScreen(AppState.DASHBOARD)} />
          </motion.div>
        )}

        {currentScreen === AppState.DASHBOARD && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            <Dashboard
              initialProfile={userProfile}
              onLogout={async () => {
                await supabase.auth.signOut();
                setCurrentScreen(AppState.LOGIN);
              }}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default App;