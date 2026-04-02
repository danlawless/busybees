import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/pos/',
          '/api/',
          '/customer/',
          '/editor/',
          '/waiver/',
          '/register/',
          '/pre-register/',
          '/auth/',
          '/pos/checkout-success',
        ],
      },
    ],
    sitemap: 'https://busybeesipc.com/sitemap.xml',
  };
}
