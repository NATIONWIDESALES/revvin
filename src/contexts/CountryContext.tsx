import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { Country, Currency } from "@/types/offer";

type CountryFilter = Country | "ALL";

interface CountryContextType {
  country: CountryFilter;
  setCountry: (c: CountryFilter) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  currencySymbol: (cur: Currency) => string;
  formatPayout: (amount: number, cur: Currency) => string;
}

const CountryContext = createContext<CountryContextType>({
  country: "US",
  setCountry: () => {},
  displayCurrency: "USD",
  setDisplayCurrency: () => {},
  currencySymbol: () => "$",
  formatPayout: () => "",
});

export const useCountry = () => useContext(CountryContext);

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<CountryFilter>("US");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");

  const setCountry = useCallback((c: CountryFilter) => {
    setCountryState(c);
    if (c === "CA") setDisplayCurrency("CAD");
    else if (c === "US") setDisplayCurrency("USD");
  }, []);

  const currencySymbol = useCallback((cur: Currency) => {
    return cur === "CAD" ? "CA$" : "$";
  }, []);

  const formatPayout = useCallback((amount: number, cur: Currency) => {
    return `${currencySymbol(cur)}${amount.toLocaleString()}`;
  }, [currencySymbol]);

  return (
    <CountryContext.Provider value={{ country, setCountry, displayCurrency, setDisplayCurrency, currencySymbol, formatPayout }}>
      {children}
    </CountryContext.Provider>
  );
};
