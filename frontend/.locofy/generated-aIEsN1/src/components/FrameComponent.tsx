import { FunctionComponent, useState, type CSSProperties } from "react";
import { Box } from "@mui/material";
import ButtonSmall from "./ButtonSmall";
import PieChart from "./PieChart";
import styles from "./FrameComponent.module.css";

export type FrameComponentType = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const FrameComponent: FunctionComponent<FrameComponentType> = ({
  className = "",
  property1 = "Default",
}) => {
  const [pieChartItems] = useState([
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Catálogo",
      pieChart: "/Package.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Pedidos",
      pieChart: "/Shopping-cart.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Clientes",
      pieChart: "/Users.svg",
    },
    {
      color: "Blue" as const,
      state: "Default" as const,
      type: "Secondary" as const,
      rightIcon: false,
      leftIcon: false,
      text: "Tickets",
      pieChart: "/Hash.svg",
    },
  ]);
  return (
    <Box
      className={[styles.frameWrapper, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.buttonSmallParent}>
        <ButtonSmall property1="Default" />
        {pieChartItems.map((item, index) => (
          <PieChart
            key={index}
            color={item.color}
            state={item.state}
            type={item.type}
            rightIcon={item.rightIcon}
            leftIcon={item.leftIcon}
            text={item.text}
            pieChart={item.pieChart}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FrameComponent;
