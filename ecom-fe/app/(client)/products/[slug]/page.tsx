// ecom-fe/app/(client)/products/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  Separator,
  Box,
  Spinner,
  IconButton,
} from '@radix-ui/themes';
import {
  StarFilledIcon,
  PlusIcon,
  MinusIcon,
  ArrowLeftIcon,
} from '@radix-ui/react-icons';
import { CiShoppingCart } from 'react-icons/ci';
import {
  productService,
  Product,
  formatVnd,
  effectivePrice,
  discountPercent,
} from '@/lib/products';
import { cartService } from '@/lib/cart';
import { useToast } from '@/components/toast-provider';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!params.slug) return;
    setLoading(true);
    productService
      .getBySlug(params.slug)
      .then(setProduct)
      .catch(() => toast('error', 'Không tìm thấy sản phẩm'))
      .finally(() => setLoading(false));
  }, [params.slug, toast]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await cartService.addItem(product.id, quantity);
      toast('success', `Đã thêm ${quantity} sản phẩm vào giỏ`);
    } catch (err: any) {
      toast(
        'error',
        err.response?.data?.message ?? 'Không thể thêm vào giỏ',
      );
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await cartService.addItem(product.id, quantity);
      router.push('/cart');
    } catch (err: any) {
      toast('error', err.response?.data?.message ?? 'Không thể thêm vào giỏ');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!product) {
    return (
      <Container size="4" px="4" py="8">
        <Card size="3" style={{ padding: '60px 20px' }}>
          <Flex direction="column" align="center" gap="3">
            <Text color="gray">Sản phẩm không tồn tại</Text>
            <Button onClick={() => router.push('/products')}>
              <ArrowLeftIcon /> Về danh sách
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const price = effectivePrice(product);
  const discount = discountPercent(product);
  const inStock = product.stock > 0;
  const maxQty = Math.min(product.stock, 999);

  return (
    <Container size="4" px="4" py="6">
      <Button
        variant="ghost"
        mb="4"
        onClick={() => router.push('/products')}
      >
        <ArrowLeftIcon /> Quay lại
      </Button>

      <Grid columns={{ initial: '1', md: '2' }} gap="6">
        {/* Ảnh */}
        <Flex direction="column" gap="3">
          <Box
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '100%',
              backgroundColor: 'var(--gray-3)',
              borderRadius: 'var(--radius-3)',
              overflow: 'hidden',
            }}
          >
            {product.images?.[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[activeImage]}
                alt={product.name}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Flex
                align="center"
                justify="center"
                style={{ position: 'absolute', inset: 0 }}
              >
                <Text color="gray">No image</Text>
              </Flex>
            )}
          </Box>

          {product.images?.length > 1 && (
            <Flex gap="2">
              {product.images.map((img, idx) => (
                <Box
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border:
                      idx === activeImage
                        ? '2px solid var(--accent-9)'
                        : '1px solid var(--gray-5)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              ))}
            </Flex>
          )}
        </Flex>

        {/* Info */}
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              {product.category}
              {product.brand && ` · ${product.brand}`}
            </Text>
            <Heading size="7">{product.name}</Heading>

            {product.reviewCount > 0 && (
              <Flex align="center" gap="1">
                <StarFilledIcon color="var(--yellow-9)" />
                <Text size="2">
                  {Number(product.rating).toFixed(1)} · {product.reviewCount} đánh giá
                </Text>
              </Flex>
            )}
          </Flex>

          <Separator size="4" />

          {/* Price */}
          <Flex align="baseline" gap="3">
            <Heading size="7" color={discount > 0 ? 'red' : undefined}>
              {formatVnd(price)}
            </Heading>
            {discount > 0 && (
              <>
                <Text
                  size="4"
                  color="gray"
                  style={{ textDecoration: 'line-through' }}
                >
                  {formatVnd(Number(product.price))}
                </Text>
                <Badge color="red" size="2">
                  -{discount}%
                </Badge>
              </>
            )}
          </Flex>

          {/* Stock */}
          <Flex align="center" gap="2">
            <Text size="2">Tình trạng:</Text>
            {inStock ? (
              <Badge color="green">
                Còn {product.stock} sản phẩm
              </Badge>
            ) : (
              <Badge color="red">Hết hàng</Badge>
            )}
          </Flex>

          {/* Quantity */}
          {inStock && (
            <Flex align="center" gap="3">
              <Text size="2">Số lượng:</Text>
              <Flex align="center" gap="1">
                <IconButton
                  variant="soft"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <MinusIcon />
                </IconButton>
                <Box
                  style={{
                    minWidth: 60,
                    textAlign: 'center',
                    padding: '6px 0',
                    border: '1px solid var(--gray-5)',
                    borderRadius: 6,
                  }}
                >
                  <Text size="3" weight="bold">
                    {quantity}
                  </Text>
                </Box>
                <IconButton
                  variant="soft"
                  disabled={quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                >
                  <PlusIcon />
                </IconButton>
              </Flex>
            </Flex>
          )}

          {/* Actions */}
          <Flex gap="3">
            <Button
              size="3"
              variant="soft"
              disabled={!inStock || adding}
              onClick={handleAddToCart}
              style={{ flex: 1, cursor: 'pointer' }}
            >
              <CiShoppingCart /> Thêm vào giỏ
            </Button>
            <Button
              size="3"
              variant="solid"
              disabled={!inStock || adding}
              onClick={handleBuyNow}
              style={{ flex: 1, cursor: 'pointer' }}
            >
              Mua ngay
            </Button>
          </Flex>

          <Separator size="4" />

          {/* Description */}
          {product.description && (
            <Flex direction="column" gap="2">
              <Heading size="4">Mô tả sản phẩm</Heading>
              <Text size="2" style={{ whiteSpace: 'pre-line' }}>
                {product.description}
              </Text>
            </Flex>
          )}
        </Flex>
      </Grid>
    </Container>
  );
}
