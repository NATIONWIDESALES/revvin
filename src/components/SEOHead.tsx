import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
}

const SEOHead = ({ title, description, path = "" }: SEOHeadProps) => {
  useEffect(() => {
    document.title = `${title} | Revvin`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    if (path) {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", `https://revvin.lovable.app${path}`);
    }
  }, [title, description, path]);

  return null;
};

export default SEOHead;