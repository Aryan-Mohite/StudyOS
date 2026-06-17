import type { NumericalSet } from "@/types";

export const mockNumericalsFourier: NumericalSet = {
  numerical_set_id: "ns-ht-001",
  topic_id: "t-ht-001",
  topic: "Fourier's Law of Heat Conduction",
  subject: "Heat Transfer",
  generated_at: "2024-09-15T11:30:00Z",
  problems: [
    {
      id: 1,
      question:
        "A brick wall is 0.5 m thick with thermal conductivity k = 0.7 W/m·K. The inner surface is at 300°C and the outer surface at 30°C. Calculate (a) the heat flux through the wall and (b) the heat transfer rate if the wall area is 15 m².",
      given: {
        "Thickness (L)": "0.5 m",
        "Thermal conductivity (k)": "0.7 W/m·K",
        "Inner surface temperature (T₁)": "300°C",
        "Outer surface temperature (T₂)": "30°C",
        "Wall area (A)": "15 m²",
      },
      find: "Heat flux q (W/m²) and heat transfer rate Q (W)",
      steps: [
        {
          step_number: 1,
          explanation:
            "Apply Fourier's Law in the form for a plane wall. For steady-state 1D conduction, the temperature gradient dT/dx = (T₂ − T₁)/L (change over thickness).",
          expression: "q = -k\\frac{dT}{dx} = k\\frac{T_1 - T_2}{L}",
        },
        {
          step_number: 2,
          explanation: "Substitute the known values to find heat flux.",
          expression:
            "q = 0.7 \\times \\frac{300 - 30}{0.5} = 0.7 \\times \\frac{270}{0.5}",
        },
        {
          step_number: 3,
          explanation: "Calculate heat flux.",
          expression: "q = 0.7 \\times 540 = 378 \\text{ W/m}^2",
        },
        {
          step_number: 4,
          explanation:
            "Heat transfer rate Q = q × A. Multiply heat flux by the wall area.",
          expression: "Q = q \\times A = 378 \\times 15 = 5670 \\text{ W} = 5.67 \\text{ kW}",
        },
      ],
      answer: "q = 378 W/m², Q = 5.67 kW",
      unit: "W/m² and W",
      difficulty: "easy",
      concept_tested: "Direct application of Fourier's Law for a plane wall",
    },
    {
      id: 2,
      question:
        "A composite wall consists of two layers: Layer 1 is concrete (k₁ = 1.4 W/m·K, L₁ = 0.2 m) and Layer 2 is brick (k₂ = 0.7 W/m·K, L₂ = 0.3 m). The inner surface is at 400°C and the outer surface at 50°C. Find the heat flux through the wall and the temperature at the interface between the two layers.",
      given: {
        "Concrete thickness (L₁)": "0.2 m",
        "Concrete conductivity (k₁)": "1.4 W/m·K",
        "Brick thickness (L₂)": "0.3 m",
        "Brick conductivity (k₂)": "0.7 W/m·K",
        "Inner temperature (T₁)": "400°C",
        "Outer temperature (T₃)": "50°C",
      },
      find: "Heat flux q (W/m²) and interface temperature T₂ (°C)",
      steps: [
        {
          step_number: 1,
          explanation:
            "For a composite wall, the total thermal resistance per unit area is the sum of individual resistances. R_total = L₁/k₁ + L₂/k₂ (per unit area, i.e., thermal resistivity).",
          expression:
            "R_{\\text{total}} = \\frac{L_1}{k_1} + \\frac{L_2}{k_2} = \\frac{0.2}{1.4} + \\frac{0.3}{0.7}",
        },
        {
          step_number: 2,
          explanation: "Calculate each resistance term.",
          expression:
            "R_{\\text{total}} = 0.1429 + 0.4286 = 0.5714 \\text{ m}^2\\text{·K/W}",
        },
        {
          step_number: 3,
          explanation:
            "Heat flux = total temperature difference / total resistance.",
          expression:
            "q = \\frac{T_1 - T_3}{R_{\\text{total}}} = \\frac{400 - 50}{0.5714} = \\frac{350}{0.5714}",
        },
        {
          step_number: 4,
          explanation: "Calculate heat flux.",
          expression: "q = 612.5 \\text{ W/m}^2",
        },
        {
          step_number: 5,
          explanation:
            "Find the interface temperature T₂ using the concrete layer alone. q = k₁(T₁ − T₂)/L₁, so T₂ = T₁ − q × L₁/k₁.",
          expression:
            "T_2 = T_1 - q \\cdot \\frac{L_1}{k_1} = 400 - 612.5 \\times \\frac{0.2}{1.4}",
        },
        {
          step_number: 6,
          explanation: "Calculate the interface temperature.",
          expression:
            "T_2 = 400 - 612.5 \\times 0.1429 = 400 - 87.5 = 312.5°C",
        },
      ],
      answer: "q = 612.5 W/m², T₂ = 312.5°C",
      unit: "W/m² and °C",
      difficulty: "medium",
      concept_tested: "Thermal resistance in series for composite plane wall",
    },
    {
      id: 3,
      question:
        "An electric wire of diameter 2 mm and thermal conductivity k = 15 W/m·K carries a current that generates heat at a rate of Q_gen = 2×10⁶ W/m³ uniformly throughout its volume. The outer surface of the wire is maintained at 100°C. Find the maximum temperature in the wire (at the centre).",
      given: {
        "Wire diameter (D)": "2 mm = 0.002 m",
        "Wire radius (r₀)": "1 mm = 0.001 m",
        "Thermal conductivity (k)": "15 W/m·K",
        "Heat generation rate (q̇)": "2 × 10⁶ W/m³",
        "Surface temperature (T_s)": "100°C",
      },
      find: "Maximum (centreline) temperature T_max (°C)",
      steps: [
        {
          step_number: 1,
          explanation:
            "For a cylinder with uniform heat generation, the temperature distribution is parabolic. The governing equation is the heat equation in cylindrical coordinates with heat generation.",
          expression:
            "\\frac{1}{r}\\frac{d}{dr}\\left(r\\frac{dT}{dr}\\right) + \\frac{\\dot{q}}{k} = 0",
        },
        {
          step_number: 2,
          explanation:
            "Solving this differential equation with boundary conditions (dT/dr = 0 at r = 0 and T = T_s at r = r₀) gives the temperature distribution.",
          expression:
            "T(r) = T_s + \\frac{\\dot{q}}{4k}(r_0^2 - r^2)",
        },
        {
          step_number: 3,
          explanation:
            "Maximum temperature occurs at the centre (r = 0). Substitute r = 0.",
          expression:
            "T_{\\max} = T_s + \\frac{\\dot{q} \\cdot r_0^2}{4k}",
        },
        {
          step_number: 4,
          explanation: "Substitute the values.",
          expression:
            "T_{\\max} = 100 + \\frac{2 \\times 10^6 \\times (0.001)^2}{4 \\times 15}",
        },
        {
          step_number: 5,
          explanation: "Calculate.",
          expression:
            "T_{\\max} = 100 + \\frac{2 \\times 10^6 \\times 10^{-6}}{60} = 100 + \\frac{2}{60} = 100 + 0.0333 \\approx 100.03°C",
        },
        {
          step_number: 6,
          explanation:
            "The temperature rise is very small because the wire is thin and has reasonable thermal conductivity. Increasing wire diameter significantly raises T_max.",
          expression: "T_{\\max} \\approx 100.03°C",
        },
      ],
      answer: "T_max ≈ 100.03°C (negligible temperature rise for this thin wire)",
      unit: "°C",
      difficulty: "hard",
      concept_tested: "Heat conduction in a cylinder with volumetric heat generation",
    },
    {
      id: 4,
      question:
        "A furnace wall has thermal conductivity k = 1.2 W/m·K. The inner surface temperature is 800°C and the outer surface is 100°C. The wall thickness is unknown. If the maximum allowable heat flux is 1200 W/m², determine the minimum required wall thickness.",
      given: {
        "Thermal conductivity (k)": "1.2 W/m·K",
        "Inner surface temperature (T₁)": "800°C",
        "Outer surface temperature (T₂)": "100°C",
        "Maximum allowable heat flux (q_max)": "1200 W/m²",
      },
      find: "Minimum wall thickness L (m)",
      steps: [
        {
          step_number: 1,
          explanation:
            "From Fourier's Law: q = k(T₁ − T₂)/L. Rearrange to solve for L.",
          expression: "L = \\frac{k(T_1 - T_2)}{q}",
        },
        {
          step_number: 2,
          explanation:
            "For the heat flux to be ≤ q_max, we need L ≥ k(T₁−T₂)/q_max.",
          expression:
            "L_{\\min} = \\frac{k(T_1 - T_2)}{q_{\\max}} = \\frac{1.2 \\times (800 - 100)}{1200}",
        },
        {
          step_number: 3,
          explanation: "Calculate.",
          expression:
            "L_{\\min} = \\frac{1.2 \\times 700}{1200} = \\frac{840}{1200} = 0.7 \\text{ m}",
        },
      ],
      answer: "Minimum wall thickness L_min = 0.7 m",
      unit: "m",
      difficulty: "medium",
      concept_tested: "Rearranging Fourier's Law to find thickness given heat flux constraint",
    },
    {
      id: 5,
      question:
        "Two large parallel plates are separated by a 50 mm gap. Plate 1 is at 250°C and plate 2 is at 30°C. The gap is filled with still air (k = 0.034 W/m·K). Assuming pure conduction (no convection), find the heat flux across the gap.",
      given: {
        "Gap thickness (L)": "50 mm = 0.05 m",
        "Plate 1 temperature (T₁)": "250°C",
        "Plate 2 temperature (T₂)": "30°C",
        "Thermal conductivity of air (k)": "0.034 W/m·K",
      },
      find: "Heat flux q (W/m²)",
      steps: [
        {
          step_number: 1,
          explanation:
            "Apply Fourier's Law for the air gap treated as a plane wall.",
          expression: "q = k\\frac{T_1 - T_2}{L}",
        },
        {
          step_number: 2,
          explanation: "Substitute values.",
          expression:
            "q = 0.034 \\times \\frac{250 - 30}{0.05} = 0.034 \\times \\frac{220}{0.05}",
        },
        {
          step_number: 3,
          explanation: "Calculate.",
          expression: "q = 0.034 \\times 4400 = 149.6 \\approx 150 \\text{ W/m}^2",
        },
        {
          step_number: 4,
          explanation:
            "Note: In practice, natural convection would occur in this air gap and significantly increase heat transfer. This result assumes pure conduction only.",
          expression: null,
        },
      ],
      answer: "q ≈ 150 W/m² (conduction only)",
      unit: "W/m²",
      difficulty: "easy",
      concept_tested:
        "Fourier's Law applied to a gas layer; understanding the conduction assumption",
    },
  ],
};

export const mockNumericalsByTopicId: Record<string, NumericalSet> = {
  "t-ht-001": mockNumericalsFourier,
};

export function getMockNumericals(topicId: string): NumericalSet | null {
  return mockNumericalsByTopicId[topicId] ?? null;
}
