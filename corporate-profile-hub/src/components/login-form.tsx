"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Check if we are in an implicit flow (fragment #access_token)
    // If so, we don't want to show the 'no_code_present' error from the redirect
    if (window.location.hash.includes("access_token")) {
      setError(null);
    } else {
      const urlError = searchParams.get("error");
      if (urlError) {
        setError(decodeURIComponent(urlError));
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/companies");
        router.refresh();
      }
    });
  }, [searchParams, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.log('Login with Google - RedirectTo:', redirectTo);
    
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          flowType: 'implicit',
        },
      });

      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login com Google");
      setLoading(false);
    }
  };

  const onSubmit = async (values: LoginValues) => {
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        throw authError;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Entre com seu e-mail e senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@exemplo.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Senha</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
              <Button 
                variant="outline" 
                type="button" 
                className="w-full" 
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 size-4">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.928 4.172-1.224 1.224-3.136 2.52-6.52 2.52-5.392 0-9.756-4.412-9.756-9.8s4.364-9.8 9.756-9.8c2.912 0 5.056 1.144 6.64 2.64l2.312-2.312C18.424 1.48 15.68 0 12.08 0 5.48 0 0 5.4 0 12s5.48 12 12.08 12c3.58 0 6.312-1.176 8.52-3.48 2.224-2.224 2.928-5.352 2.928-7.84 0-.544-.048-1.072-.12-1.576H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Google
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Não tem uma conta?{" "}
              <a 
                href="mailto:admin@corporativo.com?subject=Solicitação de Acesso - Corporate Profile Hub" 
                className="underline underline-offset-4"
              >
                Solicite acesso
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        Ao continuar, você concorda com nossos{" "}
        <a href="#">Termos de Serviço</a> e <a href="#">Política de Privacidade</a>.
      </div>
    </div>
  );
}
