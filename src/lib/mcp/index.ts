import { defineMcp } from "@lovable.dev/mcp-js";
import searchOffersTool from "./tools/search-offers";
import getOfferTool from "./tools/get-offer";
import listCategoriesTool from "./tools/list-categories";

export default defineMcp({
  name: "revvin-mcp",
  title: "Revvin Marketplace",
  version: "0.1.0",
  instructions:
    "Tools for browsing Revvin's public marketplace of referral offers. Use `search_offers` to find offers by keyword, category, city, or minimum payout; `get_offer` to fetch full details for a specific offer; and `list_categories` to discover available industry categories. All tools return public marketplace data — no authentication required.",
  tools: [searchOffersTool, getOfferTool, listCategoriesTool],
});