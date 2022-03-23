import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
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

type ProductApi = Omit<Product, "amount">;

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const storageIndex = "@RocketShoes:cart";

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart
  }, [cart]);

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem(storageIndex, JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);


  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart]
      const { data: stock } = await api.get(`/stock/${productId}`) as { data: Stock };

      const hasProductOnCart = updateCart.find(itemCart => itemCart.id === productId);

      const hasProductOnStock = stock.amount > 0;

      if (hasProductOnStock && hasProductOnCart) {

        if (hasProductOnCart.amount + 1 > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        hasProductOnCart.amount += 1
      } else if (hasProductOnStock && !hasProductOnCart){

        const { data: getProduct } = await api.get(`/products/${productId}`) as { data: ProductApi }

        updateCart.push({ ...getProduct, amount: 1 }) ;
      } else {
        throw new Error();
      }
      setCart([...updateCart]);

    } catch(e: any) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const getCart = [...cart];
      const productExist = getCart.find(itemCard => itemCard.id === productId);

      if (!productExist) {
        throw new Error();
      }

      const updateCart = getCart.filter(itemCard => itemCard.id !== productId)
      setCart([...updateCart]);
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isGreaterThanZero = amount > 0;

      if(!isGreaterThanZero) return;
      const { data: getStock } = await api.get(`/stock/${productId}`) as { data: Stock }

      if (amount > getStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart];

      const productCart = updateCart.find(itemCart => itemCart.id === productId) as Product;

      if (productCart) {

        productCart.amount = amount;
        setCart([...updateCart]);
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
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
