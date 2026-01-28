export interface User {
  id: string;
  firstName: string;
  vibeScribeId: string;
  familyUnitId?: string;
}

export interface Quiz {
  id: number;
  question: string;
  options: string[];
  timeLimit: number;
  timeLeft: number;
}
