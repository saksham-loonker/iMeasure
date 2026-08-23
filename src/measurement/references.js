export const REFERENCE_TARGETS = [
  {
    id: "door-width",
    label: "Door width",
    summary: "Check if something will fit through a doorway.",
    meters: 0.91,
  },
  {
    id: "desk-height",
    label: "Desk height",
    summary: "Typical work surface height.",
    meters: 0.74,
  },
  {
    id: "counter-height",
    label: "Counter",
    summary: "Kitchen counter reference.",
    meters: 0.91,
  },
  {
    id: "queen-mattress",
    label: "Queen mattress",
    summary: "Bed fit reference.",
    meters: 2.03,
  },
  {
    id: "carry-on",
    label: "Carry-on",
    summary: "Quick luggage check.",
    meters: 0.56,
  },
];

export function getReferenceTargetById(targetId) {
  return (
    REFERENCE_TARGETS.find((target) => target.id === targetId) ?? REFERENCE_TARGETS[0]
  );
}
