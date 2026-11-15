import {
  RecurringExpensesManager,
  type RuleFilterTab,
} from "@/components/RecurringExpensesManager";

const RecurringPage = ({ initialTab = "all" }: { initialTab?: RuleFilterTab }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 lg:px-8 py-4 sm:py-6">
      <RecurringExpensesManager initialTab={initialTab} />
    </div>
  );
};

export default RecurringPage;
