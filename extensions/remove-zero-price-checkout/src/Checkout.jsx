import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useEffect } from "preact/hooks";
import { useCartLines, useApplyCartLinesChange, useAppMetafields } from "@shopify/ui-extensions/checkout/preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const lines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const parentProductMetafields = useAppMetafields({
    type: "product",
    namespace: "custom",
    key: "parent_product",
  });

  useEffect(() => {
    const parentProductIds = new Set(
      parentProductMetafields
        .filter((entry) => entry.metafield.value != null)
        .map((entry) => `gid://shopify/Product/${entry.target.id}`)
    );

    const parentLines = lines.filter((line) => {
      const isZeroPrice = parseFloat(line.cost.totalAmount.amount) === 0;
      return isZeroPrice && parentProductIds.has(line.merchandise.product.id);
    });

    if (parentLines.length === 0) return;

    const childLines = lines.filter((line) => !parentLines.includes(line));

    (async () => {
      for (const parentLine of parentLines) {
        const parentCartId = parentLine.attributes.find(
          (attr) => attr.key === "_mws_cart"
        )?.value;

        if (parentCartId) {
          const matchingChild = childLines.find((line) =>
            line.attributes.some(
              (attr) => attr.key === "_mws_cart" && attr.value === parentCartId
            )
          );

          if (matchingChild) {
            const childAttrKeys = new Set(matchingChild.attributes.map((a) => a.key));
            const attrsToTransfer = parentLine.attributes.filter(
              (attr) => !childAttrKeys.has(attr.key)
            );

            if (attrsToTransfer.length > 0) {
              await applyCartLinesChange({
                type: "updateCartLine",
                id: matchingChild.id,
                attributes: [...matchingChild.attributes, ...attrsToTransfer],
              });
            }
          }
        }

        await applyCartLinesChange({
          type: "removeCartLine",
          id: parentLine.id,
          quantity: parentLine.quantity,
        });
      }
    })();
  }, [lines, parentProductMetafields]);

  return (
    <s-banner heading="Debug">
      <s-text>Lines: {lines.length}</s-text>
      <s-text>Metafields found: {parentProductMetafields.length}</s-text>
      {parentProductMetafields.map((entry, i) => (
        <s-text key={i}>
          Product {entry.target.id}: {entry.metafield.value}
        </s-text>
      ))}
      {lines.map((line) => (
        <s-stack key={line.id} gap="tight">
          <s-text>— {line.merchandise.product.title} (${line.cost.totalAmount.amount})</s-text>
          {line.attributes.map((attr, i) => (
            <s-text key={i}>{attr.key}: {attr.value}</s-text>
          ))}
        </s-stack>
      ))}
    </s-banner>
  );
}