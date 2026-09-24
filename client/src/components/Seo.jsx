import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE = import.meta.env.VITE_SITE_URL || 'https://zeviro.agency';

export default function Seo({ title, description, image = '/og-image.png', type = 'website', schema, noindex }) {
  const { pathname } = useLocation();
  const full = title ? `${title} | Zeviro` : 'Zeviro — Web Development, B2B Leads & Data Services';
  const desc = description || 'Zeviro is a web development, B2B lead generation and data entry agency. Order service packages online and track every project in your client portal.';
  const url = `${SITE}${pathname}`;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image.startsWith('http') ? image : `${SITE}${image}`} />
      <meta property="og:site_name" content="Zeviro" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={desc} />
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </Helmet>
  );
}
