import { BsStepper, BsStepperStep } from "@brandsync/react"

type StepState = "completed" | "active" | "error" | "upcoming"

/** Brandsync `bs-stepper`: steps before `currentStep` render as done, the failed step shows the error treatment. */
function Stepper({
  steps,
  label,
}: {
  steps: { label: string; state: StepState; note?: string; /** Only some invoices reached this step. */ partial?: boolean; /** Error step that the batch has moved past. */ passed?: boolean }[]
  label: string
}) {
  const first = steps.findIndex((step) => step.state !== "completed" && !(step.state === "error" && step.passed))
  return (
    <div className="overflow-x-clip py-10 pl-16 pr-12">
      {/* Each node sits at the start of its column, so widen the stepper until the last node reaches the right edge. */}
      <div style={{ width: "calc(120% - 29px)" }}>
        <BsStepper currentStep={first === -1 ? steps.length : first} aria-label={label} showDescription>
          {steps.map((step) => (
            <BsStepperStep
              key={step.label}
              name={step.label}
              description={step.note}
              error={step.state === "error"}
              className={[
                step.state === "error" ? "bs-step-error" : "",
                step.state === "completed" || (step.state === "error" && step.passed) ? "bs-step-done" : "",
                step.note && step.state === "error" ? "bs-step-note" : "",
                step.partial ? "bs-step-partial" : "",
                "bs-step-detail",
              ].filter(Boolean).join(" ") || undefined}
            />
          ))}
        </BsStepper>
      </div>
    </div>
  )
}

export { Stepper }
export type { StepState }
