import { type ReactNode } from "react";
import { Modal as RNModal, Pressable, Text, View } from "react-native";

import { cn } from "@/lib/cn";

import { IconButton } from "./IconButton";

export type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

// Bottom-sheet style modal: dim backdrop, rounded card sliding up from the
// bottom. Tapping the backdrop closes it.
export function Modal({ visible, onClose, title, children, className }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className={cn("rounded-t-card border border-border bg-card p-4 pb-8", className)}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">{title}</Text>
              <IconButton name="close" accessibilityLabel="Close" onPress={onClose} />
            </View>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
