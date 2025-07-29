import { DayOfWeek } from "./common.enum";

// =================== src/app/core/models/parking-schedule.interface.ts ===================
export interface ParkingSchedule {
  is24Hours: boolean;
  schedule?: DailySchedule[];
  holidays?: HolidaySchedule[];
  exceptions?: ScheduleException[];
}

export interface DailySchedule {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface HolidaySchedule {
  date: string;
  name: string;
  openTime?: string;
  closeTime?: string;
  isClosed: boolean;
}

export interface ScheduleException {
  date: string;
  reason: string;
  openTime?: string;
  closeTime?: string;
  isClosed: boolean;
}
