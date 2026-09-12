import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import colors from '../theme/colors';

/**
 * Simple markdown-like renderer for chat messages.
 * Handles: **bold**, bullet points, code blocks, headers, and <think> tag stripping.
 */
export default function FormattedMessage({ text }) {
  if (!text) return null;

  // Strip <think> tags
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!cleaned) return null;

  const lines = cleaned.split('\n');

  return (
    <View>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} style={{ height: 6 }} />;

        // Headers (#### / ### / ## / #)
        if (trimmed.startsWith('#### ')) {
          return (
            <Text key={idx} style={styles.h4}>
              {trimmed.replace('#### ', '')}
            </Text>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <Text key={idx} style={styles.h3}>
              {trimmed.replace('### ', '')}
            </Text>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <Text key={idx} style={styles.h2}>
              {trimmed.replace('## ', '')}
            </Text>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <Text key={idx} style={styles.h1}>
              {trimmed.replace('# ', '')}
            </Text>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bodyText}>
                {renderInline(trimmed.slice(2))}
              </Text>
            </View>
          );
        }

        // Numbered list
        if (/^\d+[\.\)]\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+[\.\)])\s(.*)/);
          return (
            <View key={idx} style={styles.bulletRow}>
              <Text style={styles.bulletNumber}>{match[1]}</Text>
              <Text style={styles.bodyText}>
                {renderInline(match[2])}
              </Text>
            </View>
          );
        }

        // Code block markers
        if (trimmed.startsWith('```')) {
          return null;
        }

        // Normal text
        return (
          <Text key={idx} style={styles.bodyText}>
            {renderInline(trimmed)}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Renders inline formatting: **bold** text
 */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  h1: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 5,
  },
  h2: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  h3: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 7,
    marginBottom: 4,
  },
  h4: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 3,
  },
  bodyText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 23,
    flexShrink: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
    marginBottom: 5,
  },
  bullet: {
    color: '#10B981',
    fontSize: 14,
    marginRight: 8,
    marginTop: 3,
  },
  bulletNumber: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    marginTop: 2,
    minWidth: 18,
  },
});
