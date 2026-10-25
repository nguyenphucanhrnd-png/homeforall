import { UNKNOWN_WARD } from "@/data/wards";
import type { HealthEventType, Partner, Pet, PetLook } from "./types";

// DEMO ONLY (prompt §13). Fictional animals and organisations, all is_demo,
// named neutrally (the visible "[Demo]" prefix was removed; one site-wide note replaces it: SHOW_PROTOTYPE_NOTICE).
// Dates are "days ago" so the demo stays fresh relative to the request time.

const DAY = 86_400_000;
const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY);

type HealthSpec = Partial<Record<HealthEventType, number | "planned">>;
type Spec = Omit<Pet, "publishedAt" | "lastConfirmedAt" | "health" | "isDemo" | "look" | "photos"> & {
  publishedDaysAgo: number;
  confirmedDaysAgo: number;
  health: HealthSpec;
  look: PetLook;
};

export function buildDemoPartners(now: Date): Partner[] {
  return [
    { slug: "demo-cuu-ho-a", name: "Nhóm cứu hộ Diên Hồng", type: "rescue", ward: "dien-hong", verifiedAt: ago(now, 40), isDemo: true },
    { slug: "demo-cuu-ho-b", name: "Nhóm cứu hộ Thủ Đức", type: "rescue", ward: "thu-duc", verifiedAt: ago(now, 25), isDemo: true },
    { slug: "demo-nuoi-tam-c", name: "Mạng lưới nuôi tạm Phú Mỹ", type: "foster_network", ward: "phu-my", verifiedAt: ago(now, 18), isDemo: true },
  ];
}

const CLINIC = "Phòng khám thú y đối tác";

const SPECS: Spec[] = [
  {
    code: "HFA-0001", name: "Ộ I I", species: "cat", sex: "female", ageRange: "young", size: "small", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Hiền", en: "Gentle" }, { vi: "Thích được vuốt ve", en: "Loves cuddles" }],
    goodWith: ["kids", "cats"], status: "available", partnerSlug: "demo-cuu-ho-a", publishedDaysAgo: 12, confirmedDaysAgo: 2,
    story: {
      vi: "Ộ I I là một bé mèo được tìm thấy trong một con hẻm vào mùa mưa và đã quen với nhà nuôi tạm sau vài ngày.",
      en: "Ộ I I is a cat who was found in an alley during the rainy season and settled into her foster home within days.",
    },
    idealHome: { vi: "Căn hộ yên tĩnh, có cửa sổ lưới an toàn.", en: "A calm apartment with safety-netted windows." },
    health: { checkup: 30, vaccine_core: 20, rabies: 20, deworming: 28, sterilization: "planned" },
    look: { coat: "#F2A65A", accent: "#C9742E", pattern: "tabby", ears: "pointy" },
  },
  {
    code: "HFA-0002", name: "Kiki", species: "dog", sex: "male", ageRange: "young", size: "medium", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Năng động", en: "Energetic" }, { vi: "Thích đi dạo", en: "Loves walks" }],
    goodWith: ["kids", "dogs"], status: "available", partnerSlug: "demo-cuu-ho-b", publishedDaysAgo: 20, confirmedDaysAgo: 1,
    story: {
      vi: "Kiki là chú chó được nhóm cứu hộ đón về sau khi chủ cũ chuyển đi và hiện đang chờ một gia đình thích vận động.",
      en: "Kiki is a dog the rescue group took in after his previous family moved away; he is waiting for an active home.",
    },
    idealHome: { vi: "Gia đình có thời gian dắt đi dạo mỗi ngày.", en: "A family with time for a daily walk." },
    health: { checkup: 35, vaccine_core: 30, rabies: 30, deworming: 30, sterilization: 25 },
    look: { coat: "#C8925A", accent: "#8B5E3C", pattern: "patch", ears: "floppy" },
  },
  {
    code: "HFA-0003", name: "Dinh", species: "cat", sex: "male", ageRange: "baby", size: "small", ward: "phu-my",
    temperament: [{ vi: "Tò mò", en: "Curious" }, { vi: "Ham chơi", en: "Playful" }],
    goodWith: ["cats"], status: "in_foster", partnerSlug: "demo-nuoi-tam-c", publishedDaysAgo: 5, confirmedDaysAgo: 3,
    story: {
      vi: "Dinh là bé mèo con, đang ở nhà nuôi tạm cùng hai anh chị mèo khác.",
      en: "Dinh is a kitten, staying in a foster home with two other cats.",
    },
    idealHome: { vi: "Nhà đã có mèo hiền để làm bạn.", en: "A home with a gentle cat for company." },
    health: { checkup: 6, vaccine_core: "planned", rabies: "planned", deworming: 6, sterilization: "planned" },
    look: { coat: "#F5F0EA", accent: "#B9C3CE", pattern: "patch", ears: "pointy" },
  },
  {
    code: "HFA-0004", name: "Dũng", species: "cat", sex: "female", ageRange: "young", size: "medium", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Độc lập", en: "Independent" }, { vi: "Điềm tĩnh", en: "Calm" }],
    goodWith: [], status: "available", partnerSlug: "demo-cuu-ho-a", publishedDaysAgo: 40, confirmedDaysAgo: 21,
    story: {
      vi: "Dũng là bé mèo thích không gian riêng. Tin này đã hơn 14 ngày chưa được xác nhận lại.",
      en: "Dũng is a cat who likes her own space. This listing has not been reconfirmed for 14+ days.",
    },
    idealHome: { vi: "Người lớn sống một mình hoặc gia đình yên tĩnh.", en: "A single adult or a quiet household." },
    health: { checkup: 60, vaccine_core: 55, rabies: 55, deworming: 50, sterilization: 45 },
    look: { coat: "#2E2E33", accent: "#F5F0EA", pattern: "tuxedo", ears: "pointy" },
  },
  {
    code: "HFA-0005", name: "Me", species: "dog", sex: "female", ageRange: "young", size: "small", ward: "phu-my",
    temperament: [{ vi: "Thân thiện", en: "Friendly" }, { vi: "Dễ huấn luyện", en: "Easy to train" }],
    goodWith: ["kids", "cats", "dogs"], status: "available", partnerSlug: "demo-nuoi-tam-c", publishedDaysAgo: 8, confirmedDaysAgo: 0,
    story: {
      vi: "Me là cô chó nhỏ, hợp với cả trẻ nhỏ lẫn mèo.",
      en: "Me is a small dog who gets on with children and cats.",
    },
    idealHome: { vi: "Gia đình có trẻ nhỏ, có người ở nhà ban ngày.", en: "A family with children and someone home during the day." },
    health: { checkup: 15, vaccine_core: 10, rabies: 10, deworming: 12, sterilization: "planned" },
    look: { coat: "#F5F0EA", accent: "#EED9B6", pattern: "solid", ears: "floppy" },
  },
  {
    code: "HFA-0006", name: "Tiên Tiên", species: "cat", sex: "male", ageRange: "senior", size: "medium", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Hiền lành", en: "Mellow" }, { vi: "Thích nằm phơi nắng", en: "Loves sunny spots" }],
    goodWith: ["kids"], status: "available", partnerSlug: "demo-cuu-ho-b", publishedDaysAgo: 30, confirmedDaysAgo: 4,
    story: {
      vi: "Tiên Tiên là ông mèo lớn tuổi. Những bé lớn tuổi thường chờ lâu hơn, dù rất dễ sống chung.",
      en: "Tiên Tiên is a senior cat. Older animals often wait longer, even though they are easy to live with.",
    },
    idealHome: { vi: "Nhà yên tĩnh, ít cầu thang.", en: "A quiet home with few stairs." },
    health: { checkup: 10, vaccine_core: 9, rabies: 9, deworming: 9, sterilization: 300 },
    look: { coat: "#9AA5B1", accent: "#6B7785", pattern: "tabby", ears: "pointy" },
  },
  {
    code: "HFA-0007", name: "Fanh", species: "dog", sex: "male", ageRange: "adult", size: "large", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Trung thành", en: "Loyal" }, { vi: "Hơi nhút nhát lúc đầu", en: "Shy at first" }],
    goodWith: ["dogs"], status: "adoption_pending", partnerSlug: "demo-cuu-ho-a", publishedDaysAgo: 45, confirmedDaysAgo: 5,
    story: {
      vi: "Fanh là chú chó lớn, đang trong quá trình xét hồ sơ nhận nuôi.",
      en: "Fanh is a large dog whose adoption application is under review.",
    },
    idealHome: { vi: "Nhà có sân, người nuôi kiên nhẫn.", en: "A home with a yard and a patient adopter." },
    health: { checkup: 50, vaccine_core: 45, rabies: 45, deworming: 40, sterilization: 38 },
    look: { coat: "#5A3A26", accent: "#C8925A", pattern: "patch", ears: "pointy" },
  },
  {
    code: "HFA-0008", name: "Béo", species: "cat", sex: "female", ageRange: "young", size: "small", ward: "phu-my",
    temperament: [{ vi: "Ríu rít", en: "Chatty" }, { vi: "Quấn người", en: "People-loving" }],
    goodWith: ["kids", "cats", "dogs"], status: "available", partnerSlug: "demo-nuoi-tam-c", publishedDaysAgo: 3, confirmedDaysAgo: 1,
    story: {
      vi: "Béo là bé mèo tam thể, quen với cả chó trong nhà nuôi tạm.",
      en: "Béo is a calico who got used to dogs in her foster home.",
    },
    idealHome: { vi: "Gia đình đông người, thích trò chuyện.", en: "A lively household that enjoys company." },
    health: { checkup: 4, vaccine_core: 3, rabies: "planned", deworming: 4, sterilization: "planned" },
    look: { coat: "#F5F0EA", accent: "#E39B4F", pattern: "patch", ears: "pointy" },
  },
  {
    code: "HFA-0009", name: "Xiang", species: "dog", sex: "female", ageRange: "baby", size: "small", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Lém lỉnh", en: "Cheeky" }, { vi: "Thích gặm đồ chơi", en: "Loves chew toys" }],
    goodWith: ["kids", "dogs"], status: "in_foster", partnerSlug: "demo-cuu-ho-b", publishedDaysAgo: 2, confirmedDaysAgo: 2,
    story: {
      vi: "Xiang là chó con, đang học đi vệ sinh đúng chỗ ở nhà nuôi tạm.",
      en: "Xiang is a puppy learning house training in her foster home.",
    },
    idealHome: { vi: "Người có kinh nghiệm nuôi chó con.", en: "Someone experienced with puppies." },
    health: { checkup: 3, vaccine_core: "planned", rabies: "planned", deworming: 3, sterilization: "planned" },
    look: { coat: "#2E2E33", accent: "#C8925A", pattern: "patch", ears: "floppy" },
  },
  {
    code: "HFA-0010", name: "Phúc Vương", species: "cat", sex: "male", ageRange: "young", size: "medium", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Lém lỉnh", en: "Mischievous" }, { vi: "Thích leo trèo", en: "Loves climbing" }],
    goodWith: ["cats"], status: "available", partnerSlug: "demo-cuu-ho-a", publishedDaysAgo: 15, confirmedDaysAgo: 6,
    story: {
      vi: "Phúc Vương là bé mèo thích leo lên tủ cao nhất nhà.",
      en: "Phúc Vương is a cat who climbs to the top of every cupboard.",
    },
    idealHome: { vi: "Nhà có kệ leo trèo cho mèo.", en: "A home with cat shelves to climb." },
    health: { checkup: 20, vaccine_core: 18, rabies: 18, deworming: 18, sterilization: 16 },
    look: { coat: "#EED9B6", accent: "#C9742E", pattern: "tabby", ears: "pointy" },
  },
  {
    code: "HFA-0011", name: "Gugugaga", species: "cat", sex: "female", ageRange: "senior", size: "small", ward: UNKNOWN_WARD,
    temperament: [{ vi: "Dịu dàng", en: "Sweet" }, { vi: "Ngủ nhiều", en: "Sleepy" }],
    goodWith: ["kids", "cats"], status: "available", partnerSlug: "demo-cuu-ho-b", publishedDaysAgo: 60, confirmedDaysAgo: 18,
    story: {
      vi: "Gugugaga là bà mèo lớn tuổi. Tin này cũng chưa được xác nhận lại trong hơn 14 ngày.",
      en: "Gugugaga is a senior cat. This listing has also not been reconfirmed for 14+ days.",
    },
    idealHome: { vi: "Một góc ấm áp, yên bình.", en: "A warm, peaceful corner." },
    health: { checkup: 70, vaccine_core: 65, rabies: 65, deworming: 65, sterilization: 400 },
    look: { coat: "#2E2E33", accent: "#2E2E33", pattern: "solid", ears: "pointy" },
  },
  {
    code: "HFA-0012", name: "Ovuvuevuevue Onyetenyevwe Ugwemubwem Ossas", species: "dog", sex: "male", ageRange: "young", size: "medium", ward: "phu-my",
    temperament: [{ vi: "Vui vẻ", en: "Cheerful" }, { vi: "Thích bơi", en: "Loves to swim" }],
    goodWith: ["kids", "dogs"], status: "available", partnerSlug: "demo-nuoi-tam-c", publishedDaysAgo: 10, confirmedDaysAgo: 3,
    story: {
      vi: "Ovuvuevuevue Onyetenyevwe Ugwemubwem Ossas là chú chó luôn vẫy đuôi khi gặp người lạ.",
      en: "Ovuvuevuevue Onyetenyevwe Ugwemubwem Ossas is a dog who wags his tail at every new face.",
    },
    idealHome: { vi: "Gia đình năng động, thích dã ngoại.", en: "An active family that likes outings." },
    health: { checkup: 12, vaccine_core: 11, rabies: 11, deworming: 11, sterilization: "planned" },
    look: { coat: "#E9C46A", accent: "#C9A04A", pattern: "solid", ears: "floppy" },
  },
];

export function buildDemoPets(now: Date): Pet[] {
  return SPECS.map(({ publishedDaysAgo, confirmedDaysAgo, health, ...spec }) => ({
    ...spec,
    publishedAt: ago(now, publishedDaysAgo),
    lastConfirmedAt: ago(now, confirmedDaysAgo),
    health: Object.entries(health).map(([type, when]) => ({
      type: type as HealthEventType,
      date: when === "planned" ? null : ago(now, when),
      clinic: when === "planned" ? undefined : CLINIC,
    })),
    photos: [],
    isDemo: true,
  }));
}
