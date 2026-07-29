import AssetSheet from "@/components/print/AssetSheet";
import { PRINT_ASSETS } from "@/lib/printAssets";
const biz = { name: "Northside Plumbing Co", offer_amount: "$100", offer_trigger: "the job is paid", offer_fine_print: "Reward paid after the referred job is completed and paid in full.", phone: "555 0100" };
const QaPrint = () => (
  <div className="p-4 space-y-6 bg-slate-200">
    {PRINT_ASSETS.map((a) => {
      const s = 700 / (a.widthIn * 96);
      return (
        <div key={a.id} style={{ width: 700, height: a.heightIn * 96 * s, overflow: "hidden", background: "#fff" }}>
          <AssetSheet asset={a} biz={biz} url="https://revvin.co/r/northside-plumbing" scale={s} />
        </div>
      );
    })}
  </div>
);
export default QaPrint;
