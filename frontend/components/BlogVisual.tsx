// frontend/components/BlogVisual.tsx
// Placeholder illustration that depicts a post's flow. Built from post data, so no image files are needed.
"use client";
import { Box, Flex, Text, Image } from "@chakra-ui/react";
import { Fragment } from "react";
import type { IconType } from "react-icons";
import {
  LuGlobe, LuRefreshCw, LuSearch, LuSend, LuUser, LuBadgeCheck,
  LuPin, LuBuilding2, LuFileText, LuBookmark, LuBell, LuTarget,
  LuMail, LuEyeOff, LuMessageCircle,
} from "react-icons/lu";
import type { FlowStep, FlowIconName } from "@/lib/blogPosts";

const ICONS: Record<FlowIconName, IconType> = {
  globe: LuGlobe, refresh: LuRefreshCw, search: LuSearch, send: LuSend,
  user: LuUser, badge: LuBadgeCheck, pin: LuPin, building: LuBuilding2,
  file: LuFileText, bookmark: LuBookmark, bell: LuBell, target: LuTarget,
  mail: LuMail, eyeoff: LuEyeOff, message: LuMessageCircle,
};

// Tints are derived from the brand token so they work in light and dark mode.
const TINT = "color-mix(in srgb, var(--chakra-colors-brand-solid) 14%, transparent)";
const TINT_LINE = "color-mix(in srgb, var(--chakra-colors-brand-solid) 45%, transparent)";
const DOTS = "radial-gradient(color-mix(in srgb, var(--chakra-colors-brand-solid) 20%, transparent) 1px, transparent 1px)";

type Variant = "cover" | "thumb" | "figure";

// icon = circle size, step = column width, line = connector offset (half the icon height)
const LAYOUT = {
  cover:  { icon: { base: 11, md: 14 }, step: { base: "68px", md: "132px" }, line: { base: "21px", md: "27px" } },
  figure: { icon: { base: 11, md: 12 }, step: { base: "68px", md: "112px" }, line: { base: "21px", md: "23px" } },
  thumb:  { icon: { base: 10, md: 10 }, step: { base: "40px", md: "40px" },  line: { base: "19px", md: "19px" } },
} as const;

type Props = {
  flow: FlowStep[];
  variant?: Variant;
  focus?: number;
  alt: string;
  src?: string;
};

export default function BlogVisual({ flow, variant = "cover", focus, alt, src }: Props) {
  if (src) return <Image src={src} alt={alt} w="100%" borderRadius="xl" />;

  const L = LAYOUT[variant];
  const decorative = variant === "thumb";

  return (
    <Box
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      bg="surface"
      backgroundImage={DOTS}
      backgroundSize="16px 16px"
      borderWidth="1px"
      borderRadius="xl"
      px={{ base: 2, md: 6 }}
      py={decorative ? 5 : { base: 6, md: 8 }}
    >
      <Flex align="flex-start" justify="center">
        {flow.map((step, i) => {
          const Icon = ICONS[step.icon];
          const active = focus === undefined || i === focus;
          const highlighted = focus !== undefined && i === focus;

          return (
            <Fragment key={step.label}>
              {i > 0 && (
                <Box
                  flex="1"
                  minW="3"
                  maxW="96px"
                  mt={L.line}
                  borderTopWidth="2px"
                  borderStyle="dashed"
                  borderColor={TINT_LINE}
                />
              )}
              <Flex
                direction="column"
                align="center"
                gap={2}
                w={L.step}
                flexShrink={0}
                opacity={active ? 1 : 0.6}
              >
                <Flex
                  align="center"
                  justify="center"
                  boxSize={L.icon}
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor={active ? "transparent" : TINT_LINE}
                  bg={active ? "brand.solid" : TINT}
                  color={active ? "brand.contrast" : "brand.fg"}
                  boxShadow={highlighted ? `0 0 0 5px ${TINT}` : undefined}
                >
                  <Box as={Icon} boxSize={decorative ? 5 : { base: 5, md: 6 }} aria-hidden="true" />
                </Flex>

                {!decorative && (
                  <>
                    <Text
                      fontSize={{ base: "xs", md: "sm" }}
                      fontWeight="600"
                      color="text"
                      textAlign="center"
                      lineHeight="short"
                      overflowWrap="anywhere"
                    >
                      {step.label}
                    </Text>
                    {variant === "cover" && (
                      <Text
                        display={{ base: "none", md: "block" }}
                        fontSize="xs"
                        color="fg.muted"
                        textAlign="center"
                        lineHeight="short"
                      >
                        {step.hint}
                      </Text>
                    )}
                  </>
                )}
              </Flex>
            </Fragment>
          );
        })}
      </Flex>
    </Box>
  );
}

export function BlogFigure({
  flow, focus, caption,
}: { flow: FlowStep[]; focus: number; caption: string }) {
  return (
    <Box as="figure" my={2}>
      <BlogVisual
        flow={flow}
        variant="figure"
        focus={focus}
        alt={`Flow diagram with the step “${flow[focus].label}” highlighted. ${caption}`}
      />
      <Text as="figcaption" mt={2} fontSize="sm" color="fg.muted" textAlign="center">
        {caption}
      </Text>
    </Box>
  );
}