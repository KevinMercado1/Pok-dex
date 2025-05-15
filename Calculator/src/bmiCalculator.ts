export const calculateBmi = (heightCm: number, weightKg: number): string => {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  if (bmi < 18.5) return 'Underweight';
  if (bmi >= 18.5 && bmi < 24.9) return 'Normal range';
  if (bmi >= 25 && bmi < 29.9) return 'Overweight';
  return 'Obesity';
};

if (require.main === module) {
  const [, , height, weight] = process.argv;

  if (!height || !weight || isNaN(Number(height)) || isNaN(Number(weight))) {
    console.error('Usage: npm run calculatedBmi <heightCm> <weightKg>');
    process.exit(1);
  }
  console.log(calculateBmi(Number(height), Number(weight)));
}
