import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import PieChart from "./PieChart";
import styles from "./ButtonSmall.module.css";

export type ButtonSmallType = {
  className?: string;

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const ButtonSmall: FunctionComponent<ButtonSmallType> = ({
  className = "",
  property1 = "Default",
}) => {
  return (
    <Box
      className={[styles.buttonSmall, className].join(" ")}
      data-property1={property1}
    >
      <PieChart
        color="Blue"
        state="Default"
        type="Secondary"
        rightIcon={false}
        leftIcon
        text="Dashboard"
        pieChart="/Pie-chart.svg"
      />
    </Box>
  );
};

export default ButtonSmall;
