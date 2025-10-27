import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import { TitleScreen } from '@/components/lexiq/TitleScreen';
import jupiterPng from '@/components/lexiq/Jupiter.png';
import mercuryPng from '@/components/lexiq/Mercury.png';
import saturnPng from '@/components/lexiq/Saturn.png';
import theSunPng from '@/components/lexiq/The Sun.png';
import theMoonPng from '@/components/lexiq/The Moon.png';
import { useTimeBasedTheme } from '@/hooks/useTimeBasedTheme';
import { Moon, Sun, Clock, Paintbrush } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import lexiqLogo from '@/assets/lexiq-logo.png';
import lexiqLogoWhite from '@/assets/lexiq-logo-white.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [themeOpen, setThemeOpen] = useState(false);
  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const {
    validatePassword
  } = usePasswordValidation();
  const navigate = useNavigate();
  const { currentTheme, currentDate, themeVersion, isDarkMode, themeMode, isTransitioning, toggleDarkMode, enableAutoMode, setManualTheme } = useTimeBasedTheme();

  // Password validation for signup
  const passwordValidation = activeTab === 'signup' ? validatePassword(password) : null;

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const {
      error
    } = await signIn(email, password);
    if (!error) {
      navigate('/');
    }
    setIsLoading(false);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return; // Password strength indicator will show requirements
    }
    setIsLoading(true);
    const {
      error
    } = await signUp(email, password, name);
    if (!error) {
      // Auto sign in after signup
      await signIn(email, password);
      navigate('/');
    }
    setIsLoading(false);
  };
  return <div className={`min-h-screen relative overflow-hidden transition-colors ${isTransitioning ? 'duration-[3000ms]' : 'duration-300'} ${isDarkMode ? 'dark' : ''}`}>
      {/* Time-based animated background with floating terminology */}
      <TitleScreen 
        daySunImageSrc={theSunPng}
        nightMoonImageSrc={theMoonPng}
        nightPlanetImageSrcs={[jupiterPng, saturnPng, mercuryPng]}
        controller={{ currentTheme, isTransitioning, currentDate, themeVersion }}
      />
      
      {/* Auth content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="animate-fade-in">
          <Card className="w-full max-w-[610px] shadow-lexiq border-border/40 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img 
              src={isDarkMode ? lexiqLogoWhite : lexiqLogo} 
              alt="LexiQ Logo" 
              className="h-16 hover-scale light-sweep-logo-signin" 
            />
          </div>
          <CardDescription className="text-base mt-2">
            LQA. Simple.
          </CardDescription>
        </CardHeader>
        <CardContent className="mx-[18px] px-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-[45px]">
            <TabsList className="grid w-full grid-cols-2 px-0">
              <TabsTrigger value="signin" className="px-0 mx-[7px]">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="mx-[7px]">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mx-0 px-[3px]">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2 px-0">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input id="signup-name" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2 px-0 mx-0">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  {passwordValidation && <PasswordStrengthIndicator password={password} requirements={passwordValidation.requirements} strength={passwordValidation.strength} />}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || passwordValidation && !passwordValidation.isValid}>
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Theme Mode Toggle and Copyright Footer */}
      <div className={`text-center mt-6 space-y-3 ${currentTheme === 'night' ? 'text-white' : ''}`}>
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant={themeMode === 'light' ? 'default' : 'ghost'}
            size="sm" 
            onClick={() => themeMode !== 'light' && toggleDarkMode()}
            className={`h-8 text-xs px-3 gap-2 ${currentTheme === 'night' ? 'text-white' : ''}`}
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button 
            variant={themeMode === 'dark' ? 'default' : 'ghost'}
            size="sm" 
            onClick={() => themeMode !== 'dark' && toggleDarkMode()}
            className={`h-8 text-xs px-3 gap-2 ${currentTheme === 'night' ? 'text-white' : ''}`}
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <DropdownMenu open={themeOpen} onOpenChange={setThemeOpen}>
            <DropdownMenuTrigger 
              asChild 
              onMouseEnter={() => setThemeOpen(true)} 
              onMouseLeave={() => setThemeOpen(false)}
            >
              <Button 
                variant="ghost"
                size="sm"
                className={`h-8 text-xs px-3 gap-2 ${currentTheme === 'night' ? 'text-white' : ''}`}
                aria-label="Theme selector"
                title="Theme"
              >
                <Paintbrush className="h-4 w-4" />
                Theme
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className={`min-w-[160px] ${currentTheme === 'night' ? 'bg-slate-900/95 text-slate-100 border-slate-700' : ''}`}
              onMouseEnter={() => setThemeOpen(true)}
              onMouseLeave={() => setThemeOpen(false)}
            >
              <DropdownMenuItem onClick={() => { enableAutoMode(); setThemeOpen(false); }}>
                <Clock className="mr-2 h-3.5 w-3.5" /> Auto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setManualTheme('day'); setThemeOpen(false); }}>
                <Sun className="mr-2 h-3.5 w-3.5" /> Day
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setManualTheme('night'); setThemeOpen(false); }}>
                <Moon className="mr-2 h-3.5 w-3.5" /> Night
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className={`text-sm ${currentTheme === 'night' ? 'text-white/70' : 'text-muted-foreground/60'}`}>
          © LexiQ™ Development Team
        </p>
      </div>
        </div>
      </div>
    </div>;
};
export default Auth;