import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/theme/colors";

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerClassName, className, ...props },
  ref,
) {
  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label ? <Text className="text-sm font-medium text-foreground">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted.foreground}
        className={cn(
          "rounded-card border border-input bg-card px-4 py-3 text-base text-foreground",
          error ? "border-destructive" : null,
          className,
        )}
        {...props}
      />
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
    </View>
  );
});
