export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
  errors?: Record<string, string> | string[] | null;
}

export type UserRole = 'ROLE_USER' | 'ROLE_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password?: string;
  fullName: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  email?: string;
  password?: string;
}

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  category?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  status?: TaskStatus;
}

export interface TaskRequest {
  title: string;
  description?: string;
  completed?: boolean;
  priority: TaskPriority;
  category?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface TaskFilters {
  completed?: boolean;
  priority?: TaskPriority;
  category?: string;
  status?: TaskStatus;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRequest {
  title: string;
  content?: string;
  pinned?: boolean;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
}

export interface CalendarFilters {
  start?: string;
  end?: string;
}

export type ExpenseType = 'INCOME' | 'EXPENSE';
export type ExpenseCategory = 'FOOD' | 'RENT' | 'TRANSPORT' | 'SHOPPING' | 'BILLS' | 'ENTERTAINMENT' | 'HEALTH' | 'OTHER';

export interface Expense {
  id: string;
  amount: number;
  type: ExpenseType;
  category: string;
  description?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  amount: number;
  type: ExpenseType;
  category: string;
  description?: string;
  transactionDate: string;
}

export interface ExpenseFilters {
  start?: string;
  end?: string;
  category?: string;
  type?: ExpenseType;
}

export interface CategorySum {
  category: string;
  amount: number;
}

export interface ExpenseSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  categoryBreakdown: CategorySum[];
}

export type HabitFrequency = 'DAILY' | 'WEEKLY';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount: number;
  completedToday: boolean;
  loggedToday: boolean;
  currentStreak: number;
  bestStreak: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitRequest {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount?: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalRequest {
  title: string;
  description?: string;
  targetDate?: string;
  progress?: number;
  completed?: boolean;
}

export interface DocumentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  scanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'SYSTEM' | 'REMINDER' | 'ALERT' | 'INFO' | 'WARNING' | 'SUCCESS';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: NotificationType;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'FREE' | 'MONTHLY' | 'ANNUAL';
export type PlanType = SubscriptionPlan;
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  billingCycle: string;
  startDate: string;
  endDate?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRequest {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  billingCycle: string;
  startDate: string;
  endDate?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  role: ChatMessageRole;
  content: string;
}

export interface AdminStats {
  totalUsers: number;
  totalNotes: number;
  totalTasks: number;
  totalCalendarEvents: number;
  totalExpenses: number;
  totalHabits: number;
  totalDocuments: number;
  totalNotifications: number;
  totalSubscriptions: number;
  totalAiConversations: number;
  // Optional fields returned by some backend versions
  activeSubscriptions?: number;
  totalExpensesTracked?: number;
  newUsersThisWeek?: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  enabled: boolean;
  subscriptionPlan?: SubscriptionPlan;
  createdAt: string;
}

export type BudgetStatus = 'ON_TRACK' | 'WARNING' | 'OVER_BUDGET';

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertBudgetRequest {
  category: string;
  monthlyLimit: number;
}
