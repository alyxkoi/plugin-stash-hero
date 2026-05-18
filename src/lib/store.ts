import { useSyncExternalStore } from "react";
import type { Product } from "./mock-data";

type State = {
  cart: { product: Product; qty: number }[];
  wishlist: string[]; // slugs
  cartOpen: boolean;
  searchOpen: boolean;
};

let state: State = {
  cart: [],
  wishlist: [],
  cartOpen: false,
  searchOpen: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export const useStore = <T,>(selector: (s: State) => T): T => {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot())
  );
};

export const actions = {
  addToCart(product: Product) {
    const existing = state.cart.find((i) => i.product.slug === product.slug);
    if (existing) {
      state = { ...state, cart: state.cart.map((i) => (i.product.slug === product.slug ? { ...i, qty: i.qty + 1 } : i)), cartOpen: true };
    } else {
      state = { ...state, cart: [...state.cart, { product, qty: 1 }], cartOpen: true };
    }
    emit();
  },
  removeFromCart(slug: string) {
    state = { ...state, cart: state.cart.filter((i) => i.product.slug !== slug) };
    emit();
  },
  toggleWishlist(slug: string) {
    state = { ...state, wishlist: state.wishlist.includes(slug) ? state.wishlist.filter((s) => s !== slug) : [...state.wishlist, slug] };
    emit();
  },
  openCart() {
    state = { ...state, cartOpen: true };
    emit();
  },
  closeCart() {
    state = { ...state, cartOpen: false };
    emit();
  },
  openSearch() {
    state = { ...state, searchOpen: true };
    emit();
  },
  closeSearch() {
    state = { ...state, searchOpen: false };
    emit();
  },
};
