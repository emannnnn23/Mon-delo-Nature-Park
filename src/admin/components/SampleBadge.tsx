import { Button } from "~/components/common/Button";
import { SampleTag } from "~/components/common/SampleTag";

type SampleBadgeProps = {
  /** Called when the owner says the content is real. */
  onConfirm: () => void;
  disabled?: boolean;
};

/**
 * Marks placeholder content that has not been checked yet, with the action
 * that makes it real. Content the park has not confirmed is never presented
 * as fact: until then the public site shows it as a sample.
 */
export function SampleBadge({ onConfirm, disabled = false }: SampleBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SampleTag />
      <Button
        variant="outline-dark"
        onClick={onConfirm}
        disabled={disabled}
        className="px-4"
      >
        Mark as confirmed
      </Button>
    </div>
  );
}
