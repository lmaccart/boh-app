import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Input } from "@/components/ui";
import { text } from "@/constants/text";
import { useAuth } from "@/providers/auth";

type Mode = "signIn" | "signUp";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "signUp";

  async function onSubmit() {
    setError(null);
    const missing = !email.trim() || !password || (isSignUp && !name.trim());
    if (missing) {
      setError(text.auth.errors.missingFields);
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch {
      setError(text.auth.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              {isSignUp ? text.auth.signUpTitle : text.auth.signInTitle}
            </Text>
            <Text className="text-base text-muted-foreground">
              {isSignUp ? text.auth.signUpSubtitle : text.auth.signInSubtitle}
            </Text>
          </View>

          <View className="mt-8 gap-4">
            {isSignUp ? (
              <Input
                label={text.auth.nameLabel}
                placeholder={text.auth.namePlaceholder}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            ) : null}

            <Input
              label={text.auth.emailLabel}
              placeholder={text.auth.emailPlaceholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label={text.auth.passwordLabel}
              placeholder={text.auth.passwordPlaceholder}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

            <Button
              title={isSignUp ? text.auth.signUpButton : text.auth.signInButton}
              onPress={onSubmit}
              loading={submitting}
              className="mt-2"
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setMode(isSignUp ? "signIn" : "signUp");
              }}
              className="mt-2 self-center"
            >
              <Text className="text-sm font-medium text-primary">
                {isSignUp ? text.auth.toggleToSignIn : text.auth.toggleToSignUp}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
