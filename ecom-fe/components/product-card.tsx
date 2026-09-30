// ecom-fe/components/product-card.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, Flex, Heading, Text, Badge, Box, Button } from '@radix-ui/themes';
import { StarFilledIcon } from '@radix-ui/react-icons';
import {
  Product,
  formatVnd,
  effectivePrice,
  discountPercent,
} from '@/lib/products';

export function ProductCard({ product }: { product: Product }) {
  const price = effectivePrice(product);
  const discount = discountPercent(product);
  const image = product.images?.[0];

  return (
    <Card size="2" style={{ height: '100%', overflow: 'hidden' }}>
      <Flex direction="column" gap="3" style={{ height: '100%' }}>
        {/* Ảnh */}
        <Box
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '100%', // square
            backgroundColor: 'var(--gray-3)',
            borderRadius: 'var(--radius-2)',
            overflow: 'hidden',
          }}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{ position: 'absolute', inset: 0 }}
            >
              <Text color="gray" size="1">
                No image
              </Text>
            </Flex>
          )}

          {discount > 0 && (
            <Badge
              color="red"
              size="2"
              style={{ position: 'absolute', top: 8, left: 8 }}
            >
              -{discount}%
            </Badge>
          )}
        </Box>

        {/* Info */}
        <Flex direction="column" gap="1" style={{ flex: 1 }}>
          <Text size="1" color="gray">
            {product.category}
            {product.brand && ` · ${product.brand}`}
          </Text>
          <Link
            href={`/products/${product.slug}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Heading
              size="3"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.name}
            </Heading>
          </Link>

          {product.reviewCount > 0 && (
            <Flex align="center" gap="1">
              <StarFilledIcon color="var(--yellow-9)" />
              <Text size="1" color="gray">
                {Number(product.rating).toFixed(1)} ({product.reviewCount})
              </Text>
            </Flex>
          )}
        </Flex>

        {/* Price */}
        <Flex align="baseline" gap="2">
          <Text size="4" weight="bold" color={discount > 0 ? 'red' : undefined}>
            {formatVnd(price)}
          </Text>
          {discount > 0 && (
            <Text size="1" color="gray" style={{ textDecoration: 'line-through' }}>
              {formatVnd(Number(product.price))}
            </Text>
          )}
        </Flex>

        {product.stock <= 0 && (
          <Badge color="gray" size="1">
            Hết hàng
          </Badge>
        )}
      </Flex>
    </Card>
  );
}
