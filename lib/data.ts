export type SubjectId =
  | "space" | "animals" | "body" | "dino" | "history"
  | "invent" | "earth" | "myth" | "science" | "art";

export type Subject = {
  id: SubjectId;
  label: string;
  shortLabel: string;
  tint: string;
};

export const SUBJECTS: Subject[] = [
  { id: "space",   label: "Space & Planets",              shortLabel: "Space",     tint: "#FFE9C2" },
  { id: "animals", label: "Animals & Nature",             shortLabel: "Animals",   tint: "#DDF3E6" },
  { id: "body",    label: "The Human Body",               shortLabel: "The Human Body", tint: "#FFE0E8" },
  { id: "dino",    label: "Dinosaurs & Prehistory",       shortLabel: "Dinosaurs", tint: "#DDEEF6" },
  { id: "history", label: "History & Civilizations",      shortLabel: "History",   tint: "#FFF0C2" },
  { id: "invent",  label: "Inventions & How Things Work", shortLabel: "Inventions", tint: "#FFE9C2" },
  { id: "earth",   label: "Earth & Weather",              shortLabel: "Earth",     tint: "#DDEEF6" },
  { id: "myth",    label: "Myths & Legends",              shortLabel: "Myths",     tint: "#EEDDF8" },
  { id: "science", label: "Science & Experiments",        shortLabel: "Science",   tint: "#DDF3E6" },
  { id: "art",     label: "Art & Music",                  shortLabel: "Art",       tint: "#FFE0E8" },
];

export const WONDERS: Record<SubjectId, string[]> = {
  space: [
    "Why was Pluto removed from the planets?",
    "What would happen if you fell into a black hole?",
    "How do astronauts sleep in space?",
    "Is there a sound in space?",
  ],
  animals: [
    "Why don't spiders get stuck in their own webs?",
    "How do octopuses change colour?",
    "Why do cats purr?",
    "How do bees find their way home?",
  ],
  body: [
    "Why do we get goosebumps?",
    "What happens in your brain when you dream?",
    "Why does my tummy rumble?",
    "How fast does a sneeze travel?",
  ],
  dino: [
    "How do we know what colour dinosaurs were?",
    "Did any dinosaurs really have feathers?",
    "How big was the biggest dinosaur?",
    "What killed the dinosaurs?",
  ],
  history: [
    "Why is the Kailasa Temple so special?",
    "Who built the pyramids of Giza?",
    "What did kids do for fun 1,000 years ago?",
    "Did people really fight with swords?",
  ],
  invent: [
    "How does the internet actually work?",
    "Who invented zero?",
    "How does a microwave heat food?",
    "How does a paper plane fly?",
  ],
  earth: [
    "Why do volcanoes erupt?",
    "How deep does the ocean go?",
    "What makes thunder so loud?",
    "How are rainbows made?",
  ],
  myth: [
    "What are the stories behind the constellations?",
    "Was there really a giant called Cyclops?",
    "Why did people believe in dragons?",
    "Who is Anansi the spider?",
  ],
  science: [
    "Why is the sky blue?",
    "Why does ice float on water?",
    "How does soap clean your hands?",
    "Why do leaves change colour?",
  ],
  art: [
    "Why does music give you goosebumps?",
    "How did people make paint long ago?",
    "Why do some songs feel sad?",
    "How does a guitar make sound?",
  ],
};

export type HomeWonder = { q: string; subj: SubjectId };

export const HOME_WONDERS: HomeWonder[] = [
  { q: "Why does the sky look blue?",     subj: "science" },
  { q: "How do octopuses change colour?", subj: "animals" },
  { q: "What is inside a black hole?",    subj: "space" },
  { q: "Who invented the number zero?",   subj: "invent" },
  { q: "Why do we dream at night?",       subj: "body" },
];

export function findSubject(id: string): Subject | undefined {
  return SUBJECTS.find(s => s.id === id);
}
