/**
 * Ranks configuration for gamification
 * Inspired by League of Legends ranking system
 */

// Rank tiers from lowest to highest
const tiers = [
  {
    name: "Bronze",
    divisions: 4,
    minPoints: 0,
    color: "#CD7F32",
    icon: "bronze-icon.svg"
  },
  {
    name: "Silver",
    divisions: 4,
    minPoints: 100,
    color: "#C0C0C0",
    icon: "silver-icon.svg"
  },
  {
    name: "Gold",
    divisions: 4,
    minPoints: 300,
    color: "#FFD700",
    icon: "gold-icon.svg"
  },
  {
    name: "Platinum",
    divisions: 4,
    minPoints: 600,
    color: "#00FFBF",
    icon: "platinum-icon.svg"
  },
  {
    name: "Diamond",
    divisions: 4,
    minPoints: 1000,
    color: "#B9F2FF",
    icon: "diamond-icon.svg"
  },
  {
    name: "Master",
    divisions: 1,
    minPoints: 1500,
    color: "#9370DB",
    icon: "master-icon.svg"
  },
  {
    name: "Grandmaster",
    divisions: 1,
    minPoints: 2000,
    color: "#FF4500",
    icon: "grandmaster-icon.svg"
  },
  {
    name: "Challenger",
    divisions: 1,
    minPoints: 3000,
    color: "#00BFFF",
    icon: "challenger-icon.svg"
  }
];

// Categories for volunteering
const categories = [
  {
    id: "healthcare",
    name: "Healthcare",
    icon: "healthcare-icon.svg",
    description: "Medical, wellness, and health-related volunteering",
    color: "#FF6B6B"
  },
  {
    id: "education",
    name: "Education",
    icon: "education-icon.svg",
    description: "Teaching, tutoring, and knowledge sharing",
    color: "#4ECDC4"
  },
  {
    id: "environment",
    name: "Environment",
    icon: "environment-icon.svg",
    description: "Conservation, sustainability, and green initiatives",
    color: "#5CDB95"
  },
  {
    id: "community",
    name: "Community",
    icon: "community-icon.svg",
    description: "Local support, food banks, and neighborhood improvement",
    color: "#FFD166"
  },
  {
    id: "animals",
    name: "Animals",
    icon: "animals-icon.svg",
    description: "Animal rescue, wildlife conservation, and pet care",
    color: "#937DC2"
  }
];

// Achievements based on activity
const achievements = [
  {
    id: "first_event",
    name: "First Steps",
    description: "Attend your first volunteer event",
    icon: "first-steps-icon.svg",
    points: 10
  },
  {
    id: "category_master",
    name: "Category Master",
    description: "Volunteer in all 5 categories",
    icon: "category-master-icon.svg",
    points: 50
  },
  {
    id: "consistent_helper",
    name: "Consistent Helper",
    description: "Volunteer every week for a month",
    icon: "consistent-helper-icon.svg",
    points: 100
  },
  {
    id: "hometown_hero",
    name: "Hometown Hero",
    description: "Complete 10 volunteer events in your local area",
    icon: "hometown-hero-icon.svg",
    points: 150
  },
  {
    id: "dedication",
    name: "Dedication",
    description: "Accumulate 100 hours of volunteer service",
    icon: "dedication-icon.svg",
    points: 200
  }
];

// Calculate rank based on points
const calculateRank = (points) => {
  let tier = tiers[0];
  let division = 4;
  
  // Find the appropriate tier
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].minPoints) {
      tier = tiers[i];
      
      // If it's one of the top tiers with only one division
      if (tier.divisions === 1) {
        division = 1;
        break;
      }
      
      // Calculate division within tier
      const tierRange = (i + 1 < tiers.length) 
        ? tiers[i + 1].minPoints - tier.minPoints 
        : 10000;
      const pointsInTier = points - tier.minPoints;
      const divisionSize = tierRange / tier.divisions;
      
      division = tier.divisions - Math.floor(pointsInTier / divisionSize);
      if (division < 1) division = 1;
      
      break;
    }
  }
  
  return {
    tier: tier.name,
    division,
    color: tier.color,
    icon: tier.icon,
    display: `${tier.name} ${division}`
  };
};

// Calculate progress in a category
const calculateCategoryProgress = (categoryPoints, totalPoints) => {
  if (totalPoints === 0) return 0;
  return (categoryPoints / totalPoints) * 100;
};

module.exports = {
  tiers,
  categories,
  achievements,
  calculateRank,
  calculateCategoryProgress
}; 