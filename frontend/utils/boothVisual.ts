// frontend/utils/boothVisual.ts

import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { EventBoothItem } from "../types/event";

export type BoothKind = "food" | "experience";
export type BoothIconName = ComponentProps<typeof Ionicons>["name"];

export interface BoothVisual {
  icon: BoothIconName;
  emoji: string;
  label: string;
}

interface BoothVisualRule extends BoothVisual {
  keywords: string[];
}

const asIcon = (name: string) => name as BoothIconName;

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function makeSearchText(booth: Partial<EventBoothItem>) {
  const parts = [
    booth.name,
    booth.locationLabel,
    booth.time,
    booth.host,
    booth.description,
    booth.externalLink,
    ...(booth.menu ?? []),
    ...(booth.rules ?? []),
    ...(booth.prizes ?? []),
  ];

  return parts
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const FOOD_RULES: BoothVisualRule[] = [
  {
    keywords: ["타코", "taco", "브리또", "또띠아", "나초", "멕시"],
    icon: asIcon("restaurant-outline"),
    emoji: "🌮",
    label: "타코 / 멕시칸",
  },
  {
    keywords: [
      "커피",
      "카페",
      "cafe",
      "coffee",
      "라떼",
      "아메리카노",
      "음료",
      "에이드",
      "콜라",
      "사이다",
      "주스",
      "스무디",
    ],
    icon: asIcon("cafe-outline"),
    emoji: "☕",
    label: "카페 / 음료",
  },
  {
    keywords: ["아이스", "젤라또", "빙수", "와플", "츄러스", "디저트", "크레페", "케이크"],
    icon: asIcon("ice-cream-outline"),
    emoji: "🍦",
    label: "디저트",
  },
  {
    keywords: ["피자", "pizza"],
    icon: asIcon("pizza-outline"),
    emoji: "🍕",
    label: "피자",
  },
  {
    keywords: ["버거", "햄버거", "burger", "샌드위치", "핫도그", "hotdog"],
    icon: asIcon("fast-food-outline"),
    emoji: "🍔",
    label: "버거 / 간편식",
  },
  {
    keywords: ["치킨", "닭", "강정", "꼬치", "닭꼬치"],
    icon: asIcon("fast-food-outline"),
    emoji: "🍗",
    label: "치킨 / 꼬치",
  },
  {
    keywords: ["떡볶이", "분식", "튀김", "순대", "어묵", "오뎅"],
    icon: asIcon("restaurant-outline"),
    emoji: "🍢",
    label: "분식",
  },
  {
    keywords: ["곱창", "막창", "고기", "삼겹", "갈비", "스테이크", "바비큐", "bbq", "그릴"],
    icon: asIcon("flame-outline"),
    emoji: "🔥",
    label: "고기 / 그릴",
  },
  {
    keywords: ["국수", "라멘", "우동", "면", "쌀국수", "짜장", "짬뽕", "파스타"],
    icon: asIcon("restaurant-outline"),
    emoji: "🍜",
    label: "면 요리",
  },
  {
    keywords: ["초밥", "스시", "sushi", "회", "새우", "해산물"],
    icon: asIcon("restaurant-outline"),
    emoji: "🍣",
    label: "해산물 / 초밥",
  },
  {
    keywords: ["밥", "덮밥", "도시락", "김밥", "볶음밥", "컵밥"],
    icon: asIcon("restaurant-outline"),
    emoji: "🍚",
    label: "식사류",
  },
  {
    keywords: ["푸드", "식당", "셰프", "쉐프", "맛집", "요리", "메뉴"],
    icon: asIcon("fast-food-outline"),
    emoji: "🍽️",
    label: "푸드트럭",
  },
];

const EXPERIENCE_RULES: BoothVisualRule[] = [
  {
    keywords: ["패션", "의류", "스타일", "옷", "ppc"],
    icon: asIcon("shirt-outline"),
    emoji: "👕",
    label: "패션",
  },
  {
    keywords: ["축구", "풋살", "스포츠", "운동", "오투", "농구", "야구"],
    icon: asIcon("football-outline"),
    emoji: "⚽",
    label: "스포츠",
  },
  {
    keywords: ["보드", "게임", "ludens", "루덴스", "플레이", "주사위"],
    icon: asIcon("game-controller-outline"),
    emoji: "🎲",
    label: "게임",
  },
  {
    keywords: ["경찰", "police", "방범", "안전", "순찰"],
    icon: asIcon("shield-outline"),
    emoji: "🛡️",
    label: "안전 / 방범",
  },
  {
    keywords: ["찬양", "엘림", "음악", "밴드", "노래", "공연", "합창"],
    icon: asIcon("musical-notes-outline"),
    emoji: "🎵",
    label: "음악 / 공연",
  },
  {
    keywords: ["연극", "예술", "미술", "공예", "드로잉", "그림", "디자인", "사랑방"],
    icon: asIcon("color-palette-outline"),
    emoji: "🎭",
    label: "예술",
  },
  {
    keywords: ["기독", "교회", "기도", "ccc", "아가페", "천주교", "하비온", "러빙", "프렌즈"],
    icon: asIcon("heart-outline"),
    emoji: "🤝",
    label: "교류 / 종교",
  },
  {
    keywords: ["총학생회", "학생회", "총동아리", "연합회", "jci", "youth", "여정"],
    icon: asIcon("people-outline"),
    emoji: "👥",
    label: "학생단체",
  },
  {
    keywords: ["봉사", "캠페인", "서포터", "친구", "상담"],
    icon: asIcon("people-outline"),
    emoji: "🙌",
    label: "교류 / 봉사",
  },
  {
    keywords: ["학술", "토론", "책", "독서", "스터디"],
    icon: asIcon("book-outline"),
    emoji: "📚",
    label: "학술",
  },
];

const DEFAULT_FOOD: BoothVisual = {
  icon: asIcon("fast-food-outline"),
  emoji: "🍽️",
  label: "푸드트럭",
};

const DEFAULT_EXPERIENCE: BoothVisual = {
  icon: asIcon("sparkles-outline"),
  emoji: "✨",
  label: "체험부스",
};

export function getBoothVisual(
  booth: Partial<EventBoothItem> | null | undefined,
  fallbackKind: BoothKind = "experience"
): BoothVisual {
  const safeBooth = booth ?? {};

  const kind: BoothKind =
    safeBooth.type === "food" || safeBooth.type === "experience"
      ? safeBooth.type
      : fallbackKind;

  const text = makeSearchText(safeBooth);
  const rules = kind === "food" ? FOOD_RULES : EXPERIENCE_RULES;
  const matched = rules.find((rule) => containsAny(text, rule.keywords));

  return matched ?? (kind === "food" ? DEFAULT_FOOD : DEFAULT_EXPERIENCE);
}

// default import로 잘못 가져와도 깨지지 않게 같이 export
export default getBoothVisual;