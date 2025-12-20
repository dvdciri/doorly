export interface Project {
  id: string
  name: string
  location: string
  picture: string
  description: string
  purchasePrice: number
  refurbishments: number
  revaluation: number
}

export const projects: Project[] = [
  {
    id: '1',
    name: 'Scafell Drive',
    location: 'Newcastle',
    picture: '/projects/_BIG7680.jpg',
    description: 'A large 4 bed, semi-detached family home 6 minutes to the center of Newcastle. Fully refurbished throughout.',
    purchasePrice: 110000,
    refurbishments: 25000,
    revaluation: 175000,
  },
  {
    id: '2',
    name: 'Church Lane',
    location: 'Sutton on Sea',
    picture: '/projects/71247_33567836_IMG_19_0000.jpeg',
    description: 'This very large bungalow on the seaside has been bought at auction and fully refurbished throughout. Includes a garage and a loft conversion',
    purchasePrice: 155000,
    refurbishments: 70000,
    revaluation: 310000,
  },
  {
    id: '3',
    name: 'Devonshire Square',
    location: 'Southsea',
    picture: '/projects/list_@.jpeg',
    description: 'A beautiful 1 bed flat close the the seaside in a popular area called Southsea. Rented out to long term tenants.',
    purchasePrice: 105000,
    refurbishments: 5000,
    revaluation: 140000,
  },
  {
    id: '4',
    name: 'Berdmore Street',
    location: 'Stoke-on-Trent',
    picture: '/projects/Screenshot 2023-02-26 at 17.44.54.png',
    description: 'A simple 3 bed terrace house with a low maintenance garden and 2 bathrooms in Longton, Stoke-on-Trent.',
    purchasePrice: 60500,
    refurbishments: 0,
    revaluation: 85000,
  },
  {
    id: '5',
    name: 'Spout Lane',
    location: 'Washington',
    picture: '/projects/Screenshot 2023-02-26 at 17.48.04.png',
    description: 'A 3 bedroom terraced house located in Washington, Tyne and Wear. Rented out to a family on a long term basis.',
    purchasePrice: 100000,
    refurbishments: 0,
    revaluation: 110000,
  },
  {
    id: '6',
    name: 'Dewley Road',
    location: 'Newcastle upon Tyne',
    picture: '/projects/WhatsApp Image 2023-10-06 at 12.02.05.jpeg',
    description: 'A 3 bed, semi-detached home in a family area. Fully refurbished througnout, rented out to loing term tenants.',
    purchasePrice: 106000,
    refurbishments: 28000,
    revaluation: 155000,
  },
  {
    id: '7',
    name: 'Fox Avenue',
    location: 'South Shields',
    picture: '/projects/WhatsApp Image 2023-11-16 at 14.45.56.jpeg',
    description: 'A recent refurbishment project, 3 bedroom end of terrace house, with garden and driveway',
    purchasePrice: 82500,
    refurbishments: 27500,
    revaluation: 125000,
  },
  {
    id: '8',
    name: 'Corporation Road',
    location: 'Sunderland',
    picture: '/projects/WhatsApp Image 2024-06-12 at 11.43.06.jpeg',
    description: 'A 3 bed mid-terrace house that has been bought at auction in really bad conditions. We refurbished it completely and sold it on the market.',
    purchasePrice: 49000,
    refurbishments: 42000,
    revaluation: 95000,
  },
  {
    id: '9',
    name: 'Lawrence Avenue',
    location: 'Hull',
    picture: '/projects/WhatsApp Image 2025-12-20 at 21.55.23.jpeg',
    description: 'This is a large, 3-bedroom end-terrace house that was bought from a charity and fully refurbished throughout. We sold this property on the market.',
    purchasePrice: 91500,
    refurbishments: 27500,
    revaluation: 175000,
  },
]

