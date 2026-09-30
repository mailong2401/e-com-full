// ecom-fe/components/cart-item-row.tsx
'use client';

import Link from 'next/link';
import {
  Flex,
  Text,
  Button,
  IconButton,
  Box,
  Badge,
} from '@radix-ui/themes';
import { TrashIcon, PlusIcon, MinusIcon } from '@radix-ui/react-icons';
import { CartItem } from '@/lib/cart';
import { formatVnd } from '@/lib/products';

interface Props {
  item: CartItem;
  updating: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItemRow({
  item,
  updating,
  onUpdateQuantity,
  onRemove,
}: Props) {
  const maxQty = Math.min(item.stockAvailable, 999);

  return (
    <Flex
      gap="4"
      p="4"
      style={{
        borderBottom: '1px solid var(--gray-4)',
        alignItems: 'center',
      }}
    >
      {/* Image */}
      <Box
        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'var(--gray-3)',
          flexShrink: 0,
        }}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </Box>

      {/* Info */}
      <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/products/${item.productId}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Text size="3" weight="bold" style={{ display: 'block' }}>
            {item.name}
          </Text>
        </Link>
        <Flex align="center" gap="2">
          <Text size="2" color="red" weight="bold">
            {formatVnd(Number(item.salePrice ?? item.price))}
          </Text>
          {item.salePrice && (
            <Text
              size="1"
              color="gray"
              style={{ textDecoration: 'line-through' }}
            >
              {formatVnd(Number(item.price))}
            </Text>
          )}
        </Flex>

        {!item.inStock && (
          <Badge color="red" size="1">
            Chỉ còn {item.stockAvailable} sản phẩm
          </Badge>
        )}
        {item.priceChanged && (
          <Badge color="orange" size="1">
            Giá đã thay đổi
          </Badge>
        )}
      </Flex>

      {/* Quantity */}
      <Flex align="center" gap="1">
        <IconButton
          variant="soft"
          size="2"
          disabled={updating || item.quantity <= 1}
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <MinusIcon />
        </IconButton>
        <Box
          style={{
            minWidth: 40,
            textAlign: 'center',
            padding: '4px 0',
            border: '1px solid var(--gray-5)',
            borderRadius: 6,
          }}
        >
          <Text size="2" weight="bold">
            {item.quantity}
          </Text>
        </Box>
        <IconButton
          variant="soft"
          size="2"
          disabled={updating || item.quantity >= maxQty}
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <PlusIcon />
        </IconButton>
      </Flex>

      {/* Subtotal */}
      <Box style={{ minWidth: 120, textAlign: 'right' }}>
        <Text size="3" weight="bold">
          {formatVnd(item.subtotal)}
        </Text>
      </Box>

      {/* Remove */}
      <IconButton
        variant="soft"
        color="red"
        disabled={updating}
        onClick={() => onRemove(item.id)}
      >
        <TrashIcon />
      </IconButton>
    </Flex>
  );
}
