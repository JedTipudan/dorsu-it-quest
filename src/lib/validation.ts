/** 5-point weighted-mean interpretation commonly used in local validation studies. */
export function interpret(mean: number) {
  if (mean >= 4.21) return { label: 'Excellent', color: '#c4ff3d' }
  if (mean >= 3.41) return { label: 'Very good', color: '#2de2e6' }
  if (mean >= 2.61) return { label: 'Good', color: '#ffc53d' }
  if (mean >= 1.81) return { label: 'Fair', color: '#ff8a3d' }
  return { label: 'Poor', color: '#ff3d7f' }
}
