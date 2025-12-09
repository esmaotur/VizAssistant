import React from 'react';
import { ChartTypeId, ChartDefinition } from './types';
import { 
  BarChart2, Activity, Box, GitCommit, TrendingUp, 
  Map, Grid, Layers, PieChart, Sunset
} from 'lucide-react';

// Code templates that mimic backend file generation
export const R_TEMPLATES: Record<ChartTypeId, string> = {
  [ChartTypeId.HISTOGRAM]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = numeric_column)) +
  geom_histogram(fill = "#6366f1", color = "white", bins = 30) +
  theme_minimal() +
  labs(title = "Histogram Analysis", x = "Value", y = "Count") +
  theme(text = element_text(size = 14))

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.BAR]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = category_column, y = value_column, fill = category_column)) +
  geom_bar(stat = "identity") +
  theme_minimal() +
  scale_fill_viridis_d() +
  labs(title = "Categorical Bar Plot")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.BOX]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = category_column, y = numeric_column, fill = category_column)) +
  geom_boxplot(alpha = 0.7) +
  theme_minimal() +
  labs(title = "Box Plot Distribution")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.VIOLIN]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = category_column, y = numeric_column, fill = category_column)) +
  geom_violin(trim = FALSE, alpha = 0.6) +
  geom_boxplot(width = 0.1, fill = "white") +
  theme_minimal() +
  labs(title = "Violin Plot Analysis")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.SCATTER]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = numeric_x, y = numeric_y, color = category_group)) +
  geom_point(size = 3, alpha = 0.8) +
  theme_minimal() +
  labs(title = "Scatter Plot Correlation")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.LINE]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = time_column, y = value_column, group = 1)) +
  geom_line(color = "#ec4899", size = 1.2) +
  geom_point(color = "#be185d") +
  theme_minimal() +
  labs(title = "Time Series Trend")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.DENSITY]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = numeric_column, fill = category_column)) +
  geom_density(alpha = 0.5) +
  theme_minimal() +
  labs(title = "Density Distribution")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.RIDGELINE]: `library(ggplot2)
library(ggridges)
data <- read.csv("dataset.csv")

ggplot(data, aes(x = numeric_column, y = category_column, fill = category_column)) +
  geom_density_ridges(alpha = 0.7) +
  theme_ridges() + 
  theme(legend.position = "none") +
  labs(title = "Ridgeline Plot")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.HEATMAP]: `library(ggplot2)
library(reshape2)
data <- read.csv("dataset.csv")
cormat <- round(cor(data[sapply(data, is.numeric)]),2)
melted_cormat <- melt(cormat)

ggplot(data = melted_cormat, aes(x=Var1, y=Var2, fill=value)) + 
  geom_tile() +
  scale_fill_gradient2(low = "blue", high = "red", mid = "white", midpoint = 0) +
  theme_minimal() +
  labs(title = "Correlation Heatmap")

ggsave("plot_output.png", width = 8, height = 6)`,

  [ChartTypeId.AREA]: `library(ggplot2)
data <- read.csv("dataset.csv")

ggplot(data, aes(x=time_column, y=value_column, fill=category_column)) + 
  geom_area(alpha=0.6 , size=.5, colour="white") +
  theme_minimal() +
  labs(title = "Stacked Area Chart")

ggsave("plot_output.png", width = 8, height = 6)`
};

export const PYTHON_TEMPLATES: Record<ChartTypeId, string> = {
  [ChartTypeId.HISTOGRAM]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.histplot(data=df, x="numeric_column", kde=True, color="#6366f1")
plt.title("Histogram Analysis")
plt.savefig("plot_output.png")`,

  [ChartTypeId.BAR]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.barplot(data=df, x="category_column", y="value_column", palette="viridis")
plt.title("Categorical Bar Plot")
plt.savefig("plot_output.png")`,

  [ChartTypeId.BOX]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.boxplot(data=df, x="category_column", y="numeric_column", palette="pastel")
plt.title("Box Plot Distribution")
plt.savefig("plot_output.png")`,

  [ChartTypeId.VIOLIN]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.violinplot(data=df, x="category_column", y="numeric_column", split=True, inner="quart")
plt.title("Violin Plot Analysis")
plt.savefig("plot_output.png")`,

  [ChartTypeId.SCATTER]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x="numeric_x", y="numeric_y", hue="category_group", s=100)
plt.title("Scatter Plot Correlation")
plt.savefig("plot_output.png")`,

  [ChartTypeId.LINE]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.lineplot(data=df, x="time_column", y="value_column", marker='o', color="#ec4899")
plt.title("Time Series Trend")
plt.savefig("plot_output.png")`,

  [ChartTypeId.DENSITY]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
sns.kdeplot(data=df, x="numeric_column", hue="category_column", fill=True, alpha=0.5)
plt.title("Density Distribution")
plt.savefig("plot_output.png")`,

  [ChartTypeId.RIDGELINE]: `import pandas as pd
import joypy
import matplotlib.pyplot as plt

# Requires joypy installed
df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 6))
fig, axes = joypy.joyplot(df, by="category_column", column="numeric_column", colormap=plt.cm.Spectral)
plt.title("Ridgeline Plot")
plt.savefig("plot_output.png")`,

  [ChartTypeId.HEATMAP]: `import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
plt.figure(figsize=(10, 8))
corr = df.select_dtypes(include='number').corr()
sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f")
plt.title("Correlation Heatmap")
plt.savefig("plot_output.png")`,

  [ChartTypeId.AREA]: `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("dataset.csv")
df.plot.area(x="time_column", y=["val1", "val2"], alpha=0.5, figsize=(10,6))
plt.title("Stacked Area Chart")
plt.savefig("plot_output.png")`
};


export const CHART_TYPES: ChartDefinition[] = [
  {
    id: ChartTypeId.HISTOGRAM,
    name: 'Histogram',
    description: 'Visualize the distribution of a single numerical variable.',
    icon: <BarChart2 size={24} />,
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    id: ChartTypeId.BAR,
    name: 'Bar Plot',
    description: 'Compare quantities across different categories.',
    icon: <Activity size={24} />,
    color: 'bg-indigo-500',
    gradient: 'from-indigo-400 to-indigo-600'
  },
  {
    id: ChartTypeId.BOX,
    name: 'Box Plot',
    description: 'Show summary statistics (median, quartiles) and outliers.',
    icon: <Box size={24} />,
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    id: ChartTypeId.VIOLIN,
    name: 'Violin Plot',
    description: 'Combine box plot and density plot to show distribution shape.',
    icon: <GitCommit size={24} />,
    color: 'bg-pink-500',
    gradient: 'from-pink-400 to-pink-600'
  },
  {
    id: ChartTypeId.SCATTER,
    name: 'Scatter Plot',
    description: 'Reveal relationships between two numerical variables.',
    icon: <TrendingUp size={24} />,
    color: 'bg-rose-500',
    gradient: 'from-rose-400 to-rose-600'
  },
  {
    id: ChartTypeId.LINE,
    name: 'Line Plot',
    description: 'Track changes over time or continuous intervals.',
    icon: <Activity size={24} />,
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-orange-600'
  },
  {
    id: ChartTypeId.DENSITY,
    name: 'Density Plot',
    description: 'Smooth curve representing the distribution of data.',
    icon: <Sunset size={24} />,
    color: 'bg-amber-500',
    gradient: 'from-amber-400 to-amber-600'
  },
  {
    id: ChartTypeId.RIDGELINE,
    name: 'Ridgeline Plot',
    description: 'Compare distributions of a numeric variable across groups.',
    icon: <Layers size={24} />,
    color: 'bg-teal-500',
    gradient: 'from-teal-400 to-teal-600'
  },
  {
    id: ChartTypeId.HEATMAP,
    name: 'Heatmap',
    description: 'Visualize correlation matrix or 2D density.',
    icon: <Grid size={24} />,
    color: 'bg-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600'
  },
  {
    id: ChartTypeId.AREA,
    name: 'Area Plot',
    description: 'Visualize quantitative data as a filled area over time.',
    icon: <PieChart size={24} />,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-emerald-600'
  },
];
