import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

/**
 * DriveIQ AI Support.
 *
 * Conversational helper that guides users around the app. This is the on-device
 * scaffold: it answers the common "how do I…" questions from a local knowledge
 * base so the feature is useful today, with the chat UI ready to swap onto a
 * live model backend later (replace `localAnswer` with a network call).
 */

const SUGGESTIONS = [
  'What do the coloured pins mean?',
  'How do I save an event?',
  'How do notifications work?',
  'How do I report a hazard?',
];

interface Knowledge {
  patterns: string[];
  answer: string;
}

const KB: Knowledge[] = [
  {
    patterns: ['colour', 'color', 'pin', 'dot', 'outline', 'ring', 'mean'],
    answer:
      'Each event pin is a ringed bubble. The ring colour is the category: blue = sports, purple = music, pink = theatre, amber = comedy, red = film, green = family. Sports pins show the sport symbol (⚽ 🏏 🏉 🏇…); everything else shows the DriveIQ mark. A gold ring with a ⭐ is a featured event (e.g. Royal Ascot).',
  },
  {
    patterns: ['save', 'bookmark', 'follow', 'remind', 'reminder'],
    answer:
      'Open any event and tap Save. We’ll remind you one hour before it starts so there’s time to plan your route. Tap Calendar on the same screen to add it to your phone’s calendar with the start and end time.',
  },
  {
    patterns: ['notification', 'alert', 'push', 'ping'],
    answer:
      'DriveIQ can alert you about major road incidents, train/tube line closures, and saved-event reminders. Turn categories on or off — and pick specific train lines — under Menu → Notifications. You’ll be asked for permission the first time.',
  },
  {
    patterns: ['report', 'hazard', 'accident', 'add'],
    answer:
      'Tap the ➕ button on the right of the map, line the map up over the spot, choose what’s happening (hazard, accident, roadworks, closure…), add an optional note, and submit. Your report shows as a coloured pin and clears itself after a while.',
  },
  {
    patterns: ['direction', 'route', 'navigate', 'drive', 'waze', 'maps'],
    answer:
      'Open an event and tap Get directions. You can navigate inside DriveIQ or hand off to Google Maps, Waze or Apple Maps.',
  },
  {
    patterns: ['filter', 'today', 'tomorrow', 'category', 'date'],
    answer:
      'Use the row of date chips (All / Today / Tomorrow / Next 3 Days) and the category chips below it to narrow what’s on the map. The map re-frames to fit what’s showing.',
  },
  {
    patterns: ['missing', 'not show', 'ascot', 'epsom', 'why', 'racing'],
    answer:
      'Most events come from live data feeds. A few big ones (like Royal Ascot) aren’t in those feeds, so we add them by hand — they appear with a gold featured pin. If something major is missing, send feedback and we’ll add it.',
  },
  {
    patterns: ['transit', 'train', 'tube', 'airport', 'connection'],
    answer:
      'The train icon on the right opens live tube/rail/tram status; the plane icon opens London airport rail-link status. Both update through the day.',
  },
];

function localAnswer(input: string): string {
  const q = input.toLowerCase();
  let best: { score: number; answer: string } | null = null;
  for (const k of KB) {
    const score = k.patterns.reduce((n, p) => (q.includes(p) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { score, answer: k.answer };
  }
  if (best) return best.answer;
  return "I’m still learning! I can help with pins, saving events, notifications, reporting, directions, filters and live transit. Try one of the suggestions, or send feedback from the menu and the team will follow up.";
}

export function AISupportSheet({ visible, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi! I’m DriveIQ AI Support. Ask me how anything in the app works — or tap a suggestion below.',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: localAnswer(trimmed),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botBadge}>
              <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>DriveIQ AI Support</Text>
              <Text style={styles.headerSub}>Here to help you get around</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    m.role === 'user' && styles.userBubbleText,
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            ))}

            <View style={styles.suggestionWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Ask DriveIQ…"
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => send(input)}
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              disabled={!input.trim()}
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    padding: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  userBubbleText: {
    color: colors.textOnPrimary,
  },
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
