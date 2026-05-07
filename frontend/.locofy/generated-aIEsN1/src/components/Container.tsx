import { FunctionComponent, type CSSProperties } from "react";
import { Box } from "@mui/material";
import CardHeader from "./CardHeader";
import LightChipIconFilled from "./LightChipIconFilled";
import CircleFilled from "./CircleFilled";
import ArrowUpCircle from "./ArrowUpCircle";
import styles from "./Container.module.css";

export type ContainerType = {
  className?: string;
  property11?: CSSProperties["property1"];

  /** Variant props */
  property1?: CSSProperties["property1"];
};

const Container: FunctionComponent<ContainerType> = ({
  className = "",
  property1 = "Default",
  property11,
}) => {
  return (
    <Box
      className={[styles.container, className].join(" ")}
      data-property1={property1}
    >
      <Box className={styles.container2}>
        <Box className={styles.container3}>
          <Box className={styles.container4}>
            <CardHeader
              title="OPERAÇÕES"
              subtitle="Distribuição de Pedidos"
              subtitleAlignSelf="unset"
              subtitleWidth="262px"
              subtitleDisplay="flex"
              subtitleAlignItems="center"
              description="Status x Indicador de Entrega"
            />
            <LightChipIconFilled property1={property11} />
          </Box>
          <Box className={styles.container5}>
            <Box className={styles.divrechartsWrapper}>
              <Box className={styles.component1}>
                <img className={styles.groupIcon} alt="" src="/Group.svg" />
                <Box className={styles.group}>
                  <Box className={styles.group2}>
                    <Box className={styles.group3}>
                      <div className={styles.horizontalAxisLabel}>0</div>
                    </Box>
                    <Box className={styles.group4}>
                      <div className={styles.horizontalAxisLabel2}>2500</div>
                    </Box>
                    <Box className={styles.group5}>
                      <div className={styles.horizontalAxisLabel3}>5000</div>
                    </Box>
                    <Box className={styles.group6}>
                      <div className={styles.horizontalAxisLabel4}>7500</div>
                    </Box>
                    <Box className={styles.group7}>
                      <div className={styles.horizontalAxisLabel5}>10000</div>
                    </Box>
                  </Box>
                </Box>
                <Box className={styles.container6}>
                  <Box className={styles.group8}>
                    <div className={styles.status}>Entregues</div>
                  </Box>
                  <img className={styles.groupIcon2} alt="" src="/Group1.svg" />
                </Box>
                <Box className={styles.container7}>
                  <Box className={styles.group9}>
                    <div className={styles.status2}>Em Processamento</div>
                  </Box>
                  <img className={styles.vectorIcon} alt="" src="/Vector.svg" />
                  <img
                    className={styles.dataLabelsIcon}
                    alt=""
                    src="/Data-Labels.svg"
                  />
                </Box>
                <Box className={styles.container8}>
                  <Box className={styles.group10}>
                    <div className={styles.status3}>Comprados</div>
                  </Box>
                  <img className={styles.groupIcon3} alt="" src="/Group2.svg" />
                  <img className={styles.groupIcon4} alt="" src="/Group3.svg" />
                </Box>
                <Box className={styles.container9}>
                  <Box className={styles.group11}>
                    <div className={styles.status4}>Em Trânsito</div>
                  </Box>
                  <img className={styles.groupIcon5} alt="" src="/Group4.svg" />
                  <img className={styles.groupIcon6} alt="" src="/Group5.svg" />
                </Box>
                <Box className={styles.container10}>
                  <Box className={styles.group12}>
                    <div className={styles.status5}>Enviados</div>
                  </Box>
                  <img className={styles.groupIcon7} alt="" src="/Group6.svg" />
                  <img className={styles.groupIcon8} alt="" src="/Group7.svg" />
                </Box>
              </Box>
            </Box>
            <Box className={styles.container11} />
          </Box>
        </Box>
        <Box className={styles.container12}>
          <Box className={styles.container13}>
            <Box className={styles.container14}>
              <Box className={styles.container15}>
                <CircleFilled
                  property1="dentro do prazo"
                  circleFilled="/Circle-Filled.svg"
                  dentroDoPrazo="Dentro do prazo"
                />
              </Box>
              <CircleFilled
                property1="fora do prazo"
                circleFilled="/Circle-Filled.svg"
                dentroDoPrazo="Fora do prazo"
              />
            </Box>
          </Box>
        </Box>
        <Box className={styles.container16}>
          <ArrowUpCircle
            color="Blue"
            state="Default"
            type="Secondary"
            rightIcon
            leftIcon={false}
            text="Acessar pedidos críticos"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Container;
