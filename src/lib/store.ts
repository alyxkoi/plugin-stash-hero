import { useSyncExternalStore } from "react";
import type { Product } from "./mock-data";

export type AppliedDiscount = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  scope?: "all" | "categories" | "selected";
  categories?: string[];
  productIds?: string[];
};

type State = {
  cart: { product: Product; qty: number }[];
  wishlist: string[]; // slugs
  cartOpen: boolean;
  searchOpen: boolean;
  discount: AppliedDiscount | null;
};

const CART_STORAGE_KEY = "pw_cart_v1";
const DISCOUNT_STORAGE_KEY = "pw_discount_v1";

function loadInitial(): State {
  let cart: State["cart"] = [];
  let discount: AppliedDiscount | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) cart = JSON.parse(raw);
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(DISCOUNT_STORAGE_KEY);
      if (raw) discount = JSON.parse(raw);
    } catch { /* ignore */ }
  }
  return { cart, wishlist: [], cartOpen: false, searchOpen: false, discount };
}

let state: State = loadInitial();

const listeners = new Set<() => void>();
const emit = () => {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart)); } catch { /* ignore */ }
    try {
      if (state.discount) localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(state.discount));
      else localStorage.removeItem(DISCOUNT_STORAGE_KEY);
    } catch { /* ignore */ }
  }
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export const useStore = <T,>(selector: (s: State) => T): T => {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
};

export const actions = {
  addToCart(product: Product) {
    // Digital goods: one copy per product, always qty 1. Adding a product
    // that's already in the cart is a no-op (we still open the drawer so
    // the buyer can see it's already there).
    const existing = state.cart.find((i) => i.product.slug === product.slug);
    if (existing) {
      state = { ...state, cartOpen: true };
    } else {
      state = { ...state, cart: [...state.cart, { product, qty: 1 }], cartOpen: true };
    }
    emit();
  },

  removeFromCart(slug: string) {
    state = { ...state, cart: state.cart.filter((i) => i.product.slug !== slug) };
    emit();
  },
  setCart(cart: State["cart"]) {
    state = { ...state, cart };
    emit();
  },
  clearCart() {
    state = { ...state, cart: [], discount: null };
    emit();
  },
  setDiscount(d: AppliedDiscount | null) {
    state = { ...state, discount: d };
    emit();
  },
  toggleWishlist(slug: string) {
    state = { ...state, wishlist: state.wishlist.includes(slug) ? state.wishlist.filter((s) => s !== slug) : [...state.wishlist, slug] };
    emit();
  },
  openCart() { state = { ...state, cartOpen: true }; emit(); },
  closeCart() { state = { ...state, cartOpen: false }; emit(); },
  openSearch() { state = { ...state, searchOpen: true }; emit(); },
  closeSearch() { state = { ...state, searchOpen: false }; emit(); },
};
