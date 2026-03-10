import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "trainer") navigate("/trainer", { replace: true });
      else navigate("/trainee", { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: t("login.loginFailed"), description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, ...(refCode ? { referred_by: refCode } : {}) },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: t("login.signupFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("login.checkEmail"), description: t("login.confirmationSent") });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: t("login.enterEmailFirst"), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: t("login.resetFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("login.resetEmailSent"), description: t("login.resetEmailSentDesc") });
    }
    setIsLoading(false);
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-end gap-1">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground">
            {t("login.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>

        <Card>
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t("login.login")}</TabsTrigger>
                <TabsTrigger value="signup">{t("login.signup")}</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("login.email")}</Label>
                    <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("login.password")}</Label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <div className="flex w-full justify-end">
                    <button type="button" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline" onClick={handleForgotPassword} disabled={isLoading}>
                      {t("login.forgotPassword")}
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t("login.signingIn") : t("login.signIn")}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("login.fullName")}</Label>
                    <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("login.email")}</Label>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("login.password")}</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t("login.creatingAccount") : t("login.createAccount")}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
