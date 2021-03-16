import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const currentProduct = cart.findIndex(
        (product) => product.id === productId
      );
      const productIsNotOnCart = currentProduct < 0;

      const productHasNoStock = stock.amount < 0;

      if (productIsNotOnCart) {
        if (productHasNoStock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const { data: product } = await api.get(`/products/${productId}`);

        const updatedCart = [...cart, { ...product, amount: 1 }];
        updateCart(updatedCart);
      } else {
        const productAmount = cart[currentProduct].amount + 1;

        if (stock.amount < productAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: productAmount }
            : product
        );
        updateCart(newCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      const productIsNotOnCart = productIndex < 0;

      if (productIsNotOnCart) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const cartUpdated = cart.filter((product) => product.id !== productId);
      setCart(cartUpdated);
      updateCart(cartUpdated);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((product) => product.id === productId);

      if (!product) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map((product) =>
        product.id === productId ? { ...product, amount: amount } : product
      );
      updateCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateCart = (updatedCart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
