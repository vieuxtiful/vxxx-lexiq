import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, LogOut } from 'lucide-react';
import lexiqQLogo from '@/assets/lexiq-q-logo.png';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WelcomeScreenProps {
  onEnter: () => void;
}

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
  const [showStartupOverlay, setShowStartupOverlay] = useState(true);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    setShowStartupOverlay(true);
    const timer = setTimeout(() => {
      setShowStartupOverlay(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full relative flex items-center justify-center">
      {/* Sign Out Button - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          onClick={() => setShowSignOutDialog(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Startup Overlay with Gaussian Blur */}
      <div 
        className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-[7000ms] ease-out ${
          showStartupOverlay ? 'opacity-90' : 'opacity-0'
        }`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(85px)',
          WebkitBackdropFilter: 'blur(85px)'
        }}
      />
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Logo Area */}
        <div className="mb-8 flex flex-col items-center">
          <img 
            src={lexiqQLogo} 
            alt="LexiQ Q Logo" 
            className="h-auto w-auto max-w-[120px] light-sweep-logo" 
          />
        </div>

        {/* Tagline */}
        <div className="mb-8">
          <p className="text-xl text-muted-foreground font-medium" style={{ fontSize: '1.5rem' }}>
            LQA. Simplified.
          </p>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center">
          <Button
            onClick={onEnter}
            size="lg"
            className="bg-chrome hover:bg-chrome/90 text-chrome-foreground border-0 px-12 py-6 text-lg font-bold transition-all duration-500 group"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--chrome)), hsl(var(--chrome) / 0.8))',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Start
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Version and Copyright */}
        <div className="mt-16 text-xs" style={{ color: 'hsl(var(--welcome-version-text))' }}>
          LocWorld54 Demo © LexiQ Development Team
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await signOut();
              setShowSignOutDialog(false);
            }}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}