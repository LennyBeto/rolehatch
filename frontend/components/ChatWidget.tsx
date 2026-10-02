// frontend/components/ChatWidget.tsx
"use client";
import { Box, Flex, Heading, Text, Textarea, IconButton, Button, Wrap } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { LuMessageCircle, LuX, LuSend } from "react-icons/lu";
import Logo from "./Logo";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const GREETING =
  "Hi, I'm Perchie! Ask me about PerchRole, interview prep, your CV, or anything else on your mind.";

const SUGGESTIONS = [
  "How does PerchRole work?",
  "Help me improve my CV summary",
  "Run a mock backend interview",
  "How do I feature my job listing?",
];

// Internal page paths and full URLs become clickable; (?<![\w/]) avoids matching "and/or", "CI/CD", etc.
const LINK_RE =
  /((?<![\w/])https?:\/\/[^\s)]+[^\s).,;]|(?<![\w/])\/(?:\?[^\s)]*[^\s).,;]|(?:post-job|dashboard|pricing|contact|blog|company|privacy|terms)\b[^\s)]*))/g;

function renderText(text: string) {
  return text.split(LINK_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const style = { color: "#2F4F3F", textDecoration: "underline", fontWeight: 600 };
    return part.startsWith("/") ? (
      <NextLink key={i} href={part} style={style}>{part}</NextLink>
    ) : (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={style}>{part}</a>
    );
  });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const history = next
        .filter((m) => !m.error)
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (res.status === 429) throw new Error("rate");
      if (!res.ok) throw new Error("fail");

      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "rate"
          ? "You're sending messages a bit fast. Please wait a moment and try again."
          : "I couldn't reach my brain just now. Please try again, or use /contact if it keeps happening.";
      setMessages([...next, { role: "assistant", content: msg, error: true }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!open) {
    return (
      <IconButton
        aria-label="Chat with Perchie"
        colorPalette="brand"
        borderRadius="full"
        size="xl"
        position="fixed"
        bottom={5}
        right={5}
        zIndex={20}
        boxShadow="0 6px 20px rgba(0,0,0,0.2)"
        onClick={() => setOpen(true)}
      >
        <LuMessageCircle />
      </IconButton>
    );
  }

  return (
    <Flex
      direction="column"
      position="fixed"
      bottom={5}
      right={5}
      zIndex={20}
      w={{ base: "calc(100vw - 32px)", md: "380px" }}
      h={{ base: "75vh", md: "540px" }}
      bg="surface"
      border="1px solid #E5E3DD"
      borderRadius="xl"
      boxShadow="0 12px 40px rgba(0,0,0,0.18)"
      overflow="hidden"
    >
      <Flex align="center" gap={3} px={4} py={3} bg="brand.500" color="white">
        <Logo size={28} />
        <Box flex={1}>
          <Heading size="sm" color="white">Perchie</Heading>
          <Text fontSize="xs" opacity={0.85}>PerchRole assistant</Text>
        </Box>
        <IconButton aria-label="Close chat" size="sm" variant="ghost" color="white" onClick={() => setOpen(false)}>
          <LuX />
        </IconButton>
      </Flex>

      <Box flex={1} overflowY="auto" px={3} py={3} bg="background">
        <Flex direction="column" gap={3}>
          <Box alignSelf="flex-start" maxW="85%" bg="surface" color="text" border="1px solid #E5E3DD" borderRadius="lg" px={3} py={2}>
            <Text fontSize="sm" whiteSpace="pre-wrap">{GREETING}</Text>
          </Box>

          {messages.length === 0 && (
            <Wrap gap={2}>
              {SUGGESTIONS.map((s) => (
                <Button key={s} size="xs" variant="outline" colorPalette="brand" borderRadius="full" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </Wrap>
          )}

          {messages.map((m, i) => (
            <Box
              key={i}
              alignSelf={m.role === "user" ? "flex-end" : "flex-start"}
              maxW="85%"
              bg={m.role === "user" ? "brand.500" : "surface"}
              color={m.role === "user" ? "white" : "text"}
              border={m.role === "user" ? "none" : "1px solid #E5E3DD"}
              borderRadius="lg"
              px={3}
              py={2}
            >
              <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
                {m.role === "assistant" ? renderText(m.content) : m.content}
              </Text>
            </Box>
          ))}

          {sending && (
            <Box alignSelf="flex-start" bg="surface" color="text" border="1px solid #E5E3DD" borderRadius="lg" px={3} py={2}>
              <Text fontSize="sm" color="gray.500">Perchie is typing…</Text>
            </Box>
          )}
          <div ref={endRef} />
        </Flex>
      </Box>

      <Flex gap={2} p={3} borderTop="1px solid #E5E3DD" align="flex-end" bg="surface">
        <Textarea
          placeholder="Ask Perchie…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={4000}
          rows={1}
          autoresize
          maxH="120px"
          fontSize="sm"
        />
        <IconButton aria-label="Send message" colorPalette="brand" onClick={() => send(input)} disabled={sending || !input.trim()}>
          <LuSend />
        </IconButton>
      </Flex>
    </Flex>
  );
}