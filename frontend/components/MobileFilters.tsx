// frontend/components/MobileFilters.tsx
"use client";
import { Button, Drawer, Portal, CloseButton } from "@chakra-ui/react";
import { useState } from "react";
import { LuSlidersHorizontal } from "react-icons/lu";
import FilterSidebar from "./FilterSidebar";

export default function MobileFilters() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="bottom">
      <Drawer.Trigger asChild>
        <Button variant="outline" colorPalette="brand" w="100%" minH="44px">
          <LuSlidersHorizontal /> Filters
        </Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content borderTopRadius="xl" maxH="85vh">
            <Drawer.Header>
              <Drawer.Title>Filters</Drawer.Title>
            </Drawer.Header>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" position="absolute" top={3} right={3} />
            </Drawer.CloseTrigger>
            <Drawer.Body pb={6}>
              <FilterSidebar />
              <Button colorPalette="brand" w="100%" mt={4} onClick={() => setOpen(false)}>
                Show results
              </Button>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}