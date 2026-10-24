// DEMO ONLY: illustrative volunteer tasks (journey T1). Real tasks come from
// verified partners once the database exists. Dates are relative to "now".

export type VolunteerTask = {
  id: string;
  type: "transport" | "photo" | "event" | "online";
  minutes: number;
  ward: string;
  date: Date;
  partner: string;
  online: boolean;
  isDemo: true;
};

const DAY = 86_400_000;

export function buildDemoTasks(now: Date): VolunteerTask[] {
  const at = (days: number) => new Date(now.getTime() + days * DAY);
  return [
    { id: "T-01", type: "transport", minutes: 90, ward: "dien-hong", date: at(2), partner: "Nhóm cứu hộ Diên Hồng", online: false, isDemo: true },
    { id: "T-02", type: "photo", minutes: 120, ward: "thu-duc", date: at(5), partner: "Nhóm cứu hộ Thủ Đức", online: false, isDemo: true },
    { id: "T-03", type: "event", minutes: 240, ward: "phu-my", date: at(9), partner: "Mạng lưới nuôi tạm Phú Mỹ", online: false, isDemo: true },
    { id: "T-04", type: "online", minutes: 60, ward: "", date: at(1), partner: "Nhóm cứu hộ Diên Hồng", online: true, isDemo: true },
    { id: "T-05", type: "transport", minutes: 60, ward: "thu-duc", date: at(3), partner: "Nhóm cứu hộ Thủ Đức", online: false, isDemo: true },
  ];
}
