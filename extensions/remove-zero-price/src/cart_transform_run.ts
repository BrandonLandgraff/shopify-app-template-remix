import type {
  CartTransformRunInput,
  CartTransformRunResult,
} from "../generated/api";

export function cartTransformRun(input: CartTransformRunInput): CartTransformRunResult {
  const operations = input.cart.lines
    .filter((line) => parseFloat(line.cost.totalAmount.amount) === 0)
    .map((line) => ({
      remove: {
        cartLineId: line.id,
      },
    }));

  return { operations };
};