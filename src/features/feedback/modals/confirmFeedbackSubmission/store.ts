import { create } from "zustand";
import { SubmitFeedbackConfirmation } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";

type ConfirmFeedbackSubmissionModalData = SubmitFeedbackConfirmation | null;

interface ConfirmFeedbackSubmissionModalStore {
  isOpen: boolean;
  data: ConfirmFeedbackSubmissionModalData;
  isSubmitted: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setData: (data: ConfirmFeedbackSubmissionModalData) => void;
  markAsSubmitted: () => void;
  reset: () => void;
}

export const useConfirmFeedbackSubmissionModal =
  create<ConfirmFeedbackSubmissionModalStore>((set) => ({
    isOpen: false,
    data: null,
    isSubmitted: false,
    setIsOpen: (isOpen) => set({ isOpen }),
    setData: (data) => set({ data, isOpen: true }),
    markAsSubmitted: () =>
      set({ isOpen: false, data: null, isSubmitted: true }),
    reset: () => set({ isOpen: false, data: null, isSubmitted: false }),
  }));
