// The VAPID public key is meant to be public: the browser needs it to create a
// push subscription. The matching private key lives only in backend secrets as
// VAPID_PRIVATE_KEY and is never shipped to the client.
//
// It sits in its own file with no browser types, because the Vite build plugin
// imports it too and that file is typechecked without the DOM library.
export const VAPID_PUBLIC_KEY =
  "BOtPUsZxzNrKoCZA_tIeLZ_YUpdLSKUmWcfYfORgZ5Gk0dRzGJmeKmEya_FoEaKf8pbDfb_mezvYKUpydRNgaVs";
